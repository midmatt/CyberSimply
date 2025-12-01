// Unified News Service - integrates NewsData.io and RSS feeds

import OpenAI from "openai";
import Constants from 'expo-constants';

// Initialize OpenAI client
const client = new OpenAI({ 
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || ""
});

console.log("🤖 OpenAI client initialized with API key:", client.apiKey ? "✅ Present" : "❌ Missing");

// Define ProcessedArticle interface locally to avoid import issues
export interface ProcessedArticle {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  source: string;
  author: string | null;
  authorDisplay: string; // New field for UI display
  publishedAt: string;
  imageUrl: string | undefined;
  category: 'cybersecurity' | 'hacking' | 'general';
  what: string;
  impact: string;
  takeaways: string;
  whyThisMatters: string;
}

// NewsData.io API response types
interface NewsDataArticle {
  title: string;
  link: string;
  image_url?: string;
  pubDate: string;
  source_id: string;
  description?: string;
  content?: string;
  creator?: string; // NewsData.io uses 'creator' for author
  author?: string;  // Some sources might use 'author'
}

interface NewsDataResponse {
  status: string;
  totalResults: number;
  results: NewsDataArticle[];
}

// RSS feed configuration
const RSS_FEEDS = [
  'https://krebsonsecurity.com/feed/',
  'https://feeds.feedburner.com/SecurityWeek',
  'https://www.bleepingcomputer.com/feed/',
  'https://thehackernews.com/feeds/posts/default',
  'https://www.cisa.gov/news.xml',
  'https://www.consumer.ftc.gov/news.xml'
];

export class UnifiedNewsService {
  private static readonly NEWS_DATA_API_KEY = 'pub_b2c820aa18cb49b0ad73d5672b669f18';
  private static readonly NEWS_DATA_BASE_URL = 'https://newsdata.io/api/1/news';
  
  // Search queries for different categories
  private static readonly SEARCH_QUERIES = {
    cybersecurity: 'cybersecurity',
    hacking: 'hacking',
    general: 'technology'
  };

  /**
   * Main function to get articles from all sources
   */
  static async getArticles(category: 'cybersecurity' | 'hacking' | 'general' = 'cybersecurity'): Promise<ProcessedArticle[]> {
    try {
      console.log(`=== UNIFIED SERVICE: Fetching articles for category: ${category} ===`);
      console.log(`🔍 RSS Feeds to check:`, RSS_FEEDS);
      
      // Fetch from NewsData.io, NewsAPI, and RSS feeds in parallel
      const [newsDataArticles, newsApiArticles, rssArticles] = await Promise.allSettled([
        this.fetchFromNewsData(category),
        this.fetchFromNewsAPI(category),
        this.fetchFromRSSFeeds()
      ]);

      // Combine results
      let allArticles: ProcessedArticle[] = [];
      
      if (newsDataArticles.status === 'fulfilled') {
        allArticles = [...allArticles, ...newsDataArticles.value];
        console.log(`✅ Fetched ${newsDataArticles.value.length} articles from NewsData.io`);
      } else {
        console.warn('❌ NewsData.io failed:', newsDataArticles.reason);
      }

      if (newsApiArticles.status === 'fulfilled') {
        allArticles = [...allArticles, ...newsApiArticles.value];
        console.log(`✅ Fetched ${newsApiArticles.value.length} articles from NewsAPI`);
      } else {
        console.warn('❌ NewsAPI failed:', newsApiArticles.reason);
      }

      if (rssArticles.status === 'fulfilled') {
        allArticles = [...allArticles, ...rssArticles.value];
        console.log(`✅ Fetched ${rssArticles.value.length} articles from RSS feeds`);
      } else {
        console.warn('❌ RSS feeds failed:', rssArticles.reason);
      }

      // Return only real articles from external sources
      if (allArticles.length > 0) {
        console.log(`✅ Using ${allArticles.length} external articles`);
        const uniqueArticles = this.deduplicateArticles(allArticles);
        const sortedArticles = this.sortArticlesByDate(uniqueArticles);
        
        // Debug: Log first article details
        if (sortedArticles.length > 0) {
          const firstArticle = sortedArticles[0];
          console.log(`🔍 First article details:`, {
            title: firstArticle.title,
            summary: firstArticle.summary,
            summaryLength: firstArticle.summary ? firstArticle.summary.length : 0,
            source: firstArticle.source,
            imageUrl: firstArticle.imageUrl,
            category: firstArticle.category
          });
        }
        
        return sortedArticles;
      } else {
        console.log('❌ No external articles available, using fallback content');
        return this.generateFallbackContent(category);
      }

    } catch (error) {
      console.error('Error in getArticles:', error);
      console.log('🔄 Generating fallback content due to error');
      return this.generateFallbackContent(category);
    }
  }

  /**
   * Fetch articles from NewsData.io
   */
  private static async fetchFromNewsData(category: 'cybersecurity' | 'hacking' | 'general'): Promise<ProcessedArticle[]> {
    try {
      const query = this.SEARCH_QUERIES[category];
      const url = `${this.NEWS_DATA_BASE_URL}?apikey=${this.NEWS_DATA_API_KEY}&q=${encodeURIComponent(query)}&language=en&size=50&image=1&full_content=1&content_type=article`;
      
      console.log(`Fetching from NewsData.io: ${query}`);
      console.log(`URL: ${url}`);
      
      // Try direct fetch first, then CORS proxy if it fails
      let response;
      try {
        response = await fetch(url);
      } catch (corsError) {
        console.warn('Direct fetch failed, trying CORS proxy:', corsError);
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        response = await fetch(proxyUrl);
      }
      
      if (!response.ok) {
        throw new Error(`NewsData.io error: ${response.status} ${response.statusText}`);
      }
      
      const data: NewsDataResponse = await response.json();
      
      if (data.status !== 'success') {
        throw new Error(`NewsData.io returned error: ${data.status}`);
      }
      
      console.log(`NewsData.io returned ${data.results.length} articles with real images`);
      
      // Convert to our format
      const articles = await Promise.all(data.results.map((article, index) => this.convertNewsDataArticle(article, index)));
      console.log(`Converted ${articles.length} articles from NewsData.io`);
      return articles;
      
    } catch (error) {
      console.warn('NewsData.io fetch failed:', error);
      return [];
    }
  }

  /**
   * Fetch articles from NewsAPI
   */
  private static async fetchFromNewsAPI(category: 'cybersecurity' | 'hacking' | 'general'): Promise<ProcessedArticle[]> {
    try {
      console.log(`🔍 Fetching articles from NewsAPI for category: ${category}`);
      
      // Import NewsApiService dynamically to avoid circular dependencies
      const { NewsApiService } = await import('./newsApiService');
      
      const newsApiArticles = await NewsApiService.fetchNewsByCategory(category, 1);
      console.log(`NewsAPI returned ${newsApiArticles.length} articles`);
      
      // Convert to our format
      const articles = newsApiArticles.map((article, index) => 
        NewsApiService.convertToProcessedArticle(article, index)
      );
      
      console.log(`Converted ${articles.length} articles from NewsAPI`);
      return articles;
      
    } catch (error) {
      console.warn('NewsAPI fetch failed:', error);
      return [];
    }
  }

  /**
   * Fetch articles from RSS feeds
   */
  private static async fetchFromRSSFeeds(): Promise<ProcessedArticle[]> {
    try {
      console.log(`🔍 Starting RSS feed fetch for ${RSS_FEEDS.length} feeds`);
      const allRssArticles: ProcessedArticle[] = [];
      
      // Process RSS feeds in parallel
      const rssPromises = RSS_FEEDS.map(feedUrl => this.fetchRSSFeed(feedUrl));
      const rssResults = await Promise.allSettled(rssPromises);
      
      // Collect successful results
      rssResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`✅ RSS feed ${RSS_FEEDS[index]} returned ${result.value.length} articles`);
          allRssArticles.push(...result.value);
        } else {
          console.warn(`❌ RSS feed ${RSS_FEEDS[index]} failed:`, result.reason);
        }
      });
      
      console.log(`🔍 Total RSS articles collected: ${allRssArticles.length}`);
      return allRssArticles;
      
    } catch (error) {
      console.warn('❌ RSS feeds fetch failed:', error);
      return [];
    }
  }

  /**
   * Fetch a single RSS feed
   */
  private static async fetchRSSFeed(feedUrl: string): Promise<ProcessedArticle[]> {
    try {
      console.log(`🔍 Fetching RSS feed: ${feedUrl}`);
      
      // Try multiple CORS proxies
      const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`,
        `https://cors-anywhere.herokuapp.com/${feedUrl}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(feedUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(feedUrl)}`,
        `https://thingproxy.freeboard.io/fetch/${feedUrl}`
      ];
      
      let xmlText = '';
      let lastError = null;
      
      for (const proxyUrl of proxies) {
        try {
          console.log(`🔍 Trying proxy: ${proxyUrl}`);
          const response = await fetch(proxyUrl);
          if (!response.ok) {
            throw new Error(`RSS fetch failed: ${response.status}`);
          }
          
          xmlText = await response.text();
          console.log(`✅ RSS feed response length: ${xmlText.length} characters`);
          console.log(`🔍 RSS feed preview: ${xmlText.substring(0, 200)}...`);
          break; // Success, exit the loop
          
        } catch (error) {
          console.warn(`❌ Proxy failed: ${proxyUrl}`, error);
          lastError = error;
          continue; // Try next proxy
        }
      }
      
      if (!xmlText) {
        throw lastError || new Error('All CORS proxies failed');
      }
      
      const articles = await this.parseRSSFeed(xmlText, feedUrl);
      console.log(`🔍 Parsed ${articles.length} articles from ${feedUrl}`);
      
      return articles;
      
    } catch (error) {
      console.warn(`❌ Failed to fetch RSS feed ${feedUrl}:`, error);
      return [];
    }
  }

  /**
   * Simple RSS parser (basic implementation)
   */
  private static async parseRSSFeed(xmlText: string, feedUrl: string): Promise<ProcessedArticle[]> {
    try {
      console.log(`🔍 Parsing RSS feed: ${feedUrl}`);
      const articles: ProcessedArticle[] = [];
      
      // Extract items using regex (simple approach)
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
      let match;
      let itemCount = 0;
      
      while ((match = itemRegex.exec(xmlText)) !== null) {
        itemCount++;
        const itemXml = match[1];
        
        const title = this.extractXmlValue(itemXml, 'title');
        const link = this.extractXmlValue(itemXml, 'link');
        const description = this.extractXmlValue(itemXml, 'description');
        const pubDate = this.extractXmlValue(itemXml, 'pubDate');
        const enclosure = this.extractXmlValue(itemXml, 'enclosure');
        
        console.log(`🔍 RSS Item ${itemCount}:`, {
          title: title ? title.substring(0, 50) + '...' : 'null',
          hasLink: !!link,
          hasDescription: !!description,
          hasEnclosure: !!enclosure,
          descriptionLength: description ? description.length : 0
        });
        
        if (title && link) {
          // Extract image URL from enclosure or description
          let imageUrl: string | undefined = undefined;
          if (enclosure) {
            const urlMatch = enclosure.match(/url="([^"]*)"/);
            if (urlMatch) {
              imageUrl = urlMatch[1];
            }
          }

          // Support self-closing enclosure tags (e.g. <enclosure url="..." />)
          if (!imageUrl) {
            const enclosureTagMatch = itemXml.match(/<enclosure[^>]+url="([^"]+)"[^>]*\/?>(?:<\/enclosure>)?/i);
            if (enclosureTagMatch) {
              imageUrl = enclosureTagMatch[1];
            }
          }

          // Support media:content tags commonly used for images
          if (!imageUrl) {
            const mediaContentMatch = itemXml.match(/<media:content[^>]+url="([^"]+)"[^>]*>/i);
            if (mediaContentMatch) {
              imageUrl = mediaContentMatch[1];
            }
          }

          // Fallback: extract image from description
          if (!imageUrl && description) {
            const imgMatch = description.match(/<img[^>]+src="([^"]*)"/i);
            if (imgMatch) imageUrl = imgMatch[1];
          }

          // Validate and fix image URL
          if (imageUrl) {
            console.log(`🔍 RSS Image found: ${imageUrl}`);
            // Ensure HTTPS
            if (imageUrl.startsWith('http://')) {
              imageUrl = imageUrl.replace('http://', 'https://');
              console.log(`🔒 Converted to HTTPS: ${imageUrl}`);
            }
            // Check if it's a valid image URL
            if (!this.isValidImageUrl(imageUrl)) {
              console.log(`❌ RSS Image invalid: ${imageUrl}`);
              imageUrl = undefined;
            } else {
              console.log(`✅ RSS Image valid: ${imageUrl}`);
            }
          } else {
            console.log(`❌ No RSS image found for: "${title}"`);
            // Debug: let's see what's in the description
            if (description) {
              console.log(`🔍 Description contains: ${description.substring(0, 200)}...`);
            }
          }
          
          // Clean up description - remove HTML tags and use real content only
          let cleanDescription = this.cleanText(description) || '';
          
          console.log(`🔍 RSS Article: "${title}"`);
          console.log(`🔍 Original description: ${description ? description.substring(0, 100) + '...' : 'null'}`);
          console.log(`🔍 Cleaned description: ${cleanDescription ? cleanDescription.substring(0, 100) + '...' : 'empty'}`);
          
          // Simplify with AI if we have enough content
          if (cleanDescription && cleanDescription.length > 20) {
            console.log(`🤖 Attempting AI simplification for RSS article: "${title}"`);
            try {
              cleanDescription = await this.simplifyWithAI(cleanDescription);
              console.log(`✅ AI simplification successful for RSS article`);
            } catch (error) {
              console.error(`❌ AI simplification failed for RSS article:`, error);
            }
          } else {
            console.log(`⚠️ Skipping AI simplification - description too short: ${cleanDescription ? cleanDescription.length : 0} chars`);
          }
          
          // Don't truncate - let the UI handle display
          // if (cleanDescription && cleanDescription.length > 200) {
          //   cleanDescription = cleanDescription.substring(0, 200) + '...';
          // }
          
          // If no description available, create a meaningful summary from the title
          if (!cleanDescription || cleanDescription.length < 10) {
            console.log(`⚠️ Description too short (${cleanDescription ? cleanDescription.length : 0} chars), creating summary from title`);
            cleanDescription = `This article discusses ${title.toLowerCase()}. Stay informed about the latest developments in cybersecurity and technology.`;
          }
          
          // Final safety check - ensure we never have empty summaries
          if (!cleanDescription || cleanDescription.trim().length === 0) {
            console.log(`🔄 Final safety check: creating fallback summary`);
            cleanDescription = `Stay informed about the latest cybersecurity developments and best practices.`;
          }
          
          // Simplify title with AI if it's too technical
          let simplifiedTitle = this.cleanText(title);
          if (simplifiedTitle.length > 50 && (simplifiedTitle.includes('vulnerability') || simplifiedTitle.includes('exploit') || simplifiedTitle.includes('malware'))) {
            simplifiedTitle = await this.simplifyWithAI(simplifiedTitle);
          }

          // Generate content sections using AI or fallback templates
          const sections = await this.generateArticleSections(simplifiedTitle, cleanDescription);
          
          // Create authorDisplay field: use author if available, otherwise use source
          const author = this.extractAuthorFromSource(this.getSourceName(feedUrl));
          let authorDisplay = author || this.getSourceName(feedUrl);
          
          // If no author found, try AI extraction from content
          if (!author && cleanDescription && cleanDescription.length > 100) {
            try {
              console.log('Using AI to extract author from RSS content...');
              const aiAuthor = await this.extractAuthorWithAI(cleanDescription, simplifiedTitle);
              if (aiAuthor) {
                console.log('AI found RSS author:', aiAuthor);
                authorDisplay = aiAuthor;
              }
            } catch (error) {
              console.warn('AI author extraction failed for RSS:', error);
            }
          }
          
          const article: ProcessedArticle = {
            id: `rss-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: simplifiedTitle,
            summary: cleanDescription,
            sourceUrl: link,
            source: this.getSourceName(feedUrl),
            author: author,
            authorDisplay: authorDisplay, // New field for UI display
            publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            imageUrl: imageUrl,
            category: this.determineCategory(title, description),
            what: sections.what,
            impact: sections.impact,
            takeaways: sections.takeaways,
            whyThisMatters: sections.whyThisMatters
          };
          
          articles.push(article);
        }
      }
      
      console.log(`🔍 RSS parsing complete for ${feedUrl}: ${itemCount} items found, ${articles.length} articles created`);
      
      // If no articles were created, try a different parsing approach
      if (articles.length === 0 && itemCount > 0) {
        console.log(`⚠️ No articles created despite finding ${itemCount} items, trying alternative parsing`);
        // Try to create at least one article from the first item
        const firstItemMatch = xmlText.match(/<item[^>]*>([\s\S]*?)<\/item>/i);
        if (firstItemMatch) {
          const firstItem = firstItemMatch[1];
          const title = this.extractXmlValue(firstItem, 'title') || 'Cybersecurity News Update';
          const link = this.extractXmlValue(firstItem, 'link') || 'https://example.com';
          const description = this.extractXmlValue(firstItem, 'description') || 'Stay informed about the latest cybersecurity developments.';
          
          const cleanTitle = this.cleanText(title);
          const cleanDesc = this.cleanText(description);
          
          const fallbackSummary = cleanDesc || `This article discusses ${cleanTitle.toLowerCase()}. Stay informed about the latest developments in cybersecurity and technology.`;
          const sections = await this.generateArticleSections(cleanTitle, fallbackSummary);
          
          // Create authorDisplay field for fallback article
          const author = this.extractAuthorFromSource(this.getSourceName(feedUrl));
          const authorDisplay = author || this.getSourceName(feedUrl);
          
          const fallbackArticle: ProcessedArticle = {
            id: `rss-fallback-${Date.now()}`,
            title: cleanTitle,
            summary: fallbackSummary,
            sourceUrl: link,
            source: this.getSourceName(feedUrl),
            author: author,
            authorDisplay: authorDisplay, // New field for UI display
            publishedAt: new Date().toISOString(),
            imageUrl: undefined,
            category: this.determineCategory(title, description),
            what: sections.what,
            impact: sections.impact,
            takeaways: sections.takeaways,
            whyThisMatters: sections.whyThisMatters
          };
          
          articles.push(fallbackArticle);
          console.log(`✅ Created fallback article: ${fallbackArticle.title}`);
        }
      }
      
      return articles.slice(0, 20); // Limit to 20 articles per feed
      
    } catch (error) {
      console.warn(`❌ Failed to parse RSS feed ${feedUrl}:`, error);
      return [];
    }
  }

  /**
   * Extract value from XML using regex
   */
  private static extractXmlValue(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Clean HTML/text content
   */
  private static cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\]\]>/g, '') // Remove XML CDATA end markers
      .replace(/<!\[CDATA\[/g, '') // Remove XML CDATA start markers
      .replace(/\]\]&gt;/g, '') // Remove escaped CDATA end markers
      .replace(/&lt;!\[CDATA\[/g, '') // Remove escaped CDATA start markers
      .trim();
  }

  /**
   * Get source name from feed URL
   */
  private static getSourceName(feedUrl: string): string {
    const url = new URL(feedUrl);
    const hostname = url.hostname;
    
    if (hostname.includes('krebsonsecurity')) return 'KrebsOnSecurity';
    if (hostname.includes('securityweek')) return 'SecurityWeek';
    if (hostname.includes('bleepingcomputer')) return 'BleepingComputer';
    if (hostname.includes('hackernews')) return 'The Hacker News';
    if (hostname.includes('cisa.gov')) return 'CISA';
    if (hostname.includes('ftc.gov')) return 'FTC';
    
    return hostname.replace('www.', '');
  }

  /**
   * Convert NewsData.io article to our format
   */
  private static async convertNewsDataArticle(article: NewsDataArticle, index: number): Promise<ProcessedArticle> {
    console.log(`Processing article ${index}: "${article.title}"`);
    console.log(`Image URL: ${article.image_url}`);
    
    // Use the actual image_url from NewsData.io only
    let imageUrl = article.image_url;
    
    // If no image from NewsData.io, try to extract from description
    if (!imageUrl && article.description) {
      const imgMatch = article.description.match(/<img[^>]+src="([^"]*)"/i);
      if (imgMatch) {
        imageUrl = imgMatch[1];
        console.log(`Extracted image from description: ${imageUrl}`);
      }
    }
    
    // Validate and fix image URL
    if (imageUrl) {
      // Ensure HTTPS
      if (imageUrl.startsWith('http://')) {
        imageUrl = imageUrl.replace('http://', 'https://');
      }
      // For NewsData.io, be more permissive with image validation
      // Only reject obviously invalid URLs
      if (imageUrl.length < 10 || !imageUrl.includes('http')) {
        console.log(`❌ NewsData.io image URL too short or invalid: ${imageUrl}`);
        imageUrl = undefined;
      } else {
        console.log(`✅ NewsData.io image URL accepted: ${imageUrl}`);
      }
    }
    
    // Only use real images or undefined - no fallbacks
    if (imageUrl) {
      console.log(`✅ Using real image: ${imageUrl}`);
    } else {
      console.log(`❌ No valid image available for article: "${article.title}"`);
    }
    
    // Get full article content - prefer content over description
    let fullContent = article.content || article.description || '';
    
    console.log(`🔍 NewsData Article: "${article.title}"`);
    console.log(`🔍 Has content: ${!!article.content}`);
    console.log(`🔍 Has description: ${!!article.description}`);
    console.log(`🔍 Content length: ${fullContent.length} characters`);
    
    let rewrittenContent = '';
    
    if (fullContent && fullContent.length > 50) {
      // Clean the content
      fullContent = this.cleanText(fullContent);
      
      console.log(`🤖 Rewriting full article with ChatGPT: "${article.title}"`);
      try {
        // Use ChatGPT to rewrite the entire article in plain English
        rewrittenContent = await this.rewriteArticleWithAI(article.title, fullContent);
        console.log(`✅ Article rewritten successfully (${rewrittenContent.length} chars)`);
      } catch (error) {
        console.error(`❌ Article rewriting failed:`, error);
        // Fallback to simplified description - use full content
        rewrittenContent = await this.simplifyWithAI(fullContent);
      }
    } else {
      console.log(`⚠️ No sufficient content available, creating summary from title`);
      rewrittenContent = `This article discusses ${article.title.toLowerCase()}. Stay informed about the latest developments in cybersecurity and technology.`;
    }
    
    // Final safety check - ensure we never have empty content
    if (!rewrittenContent || rewrittenContent.trim().length === 0) {
      console.log(`🔄 Final safety check: creating fallback content`);
      rewrittenContent = `Stay informed about the latest cybersecurity developments and best practices.`;
    }
    
    // Simplify title with AI if it's too technical
    let simplifiedTitle = article.title;
    if (article.title.length > 50 && (article.title.includes('vulnerability') || article.title.includes('exploit') || article.title.includes('malware'))) {
      simplifiedTitle = await this.simplifyWithAI(article.title);
    }

    // Generate content sections using AI or fallback templates
    const sections = await this.generateArticleSections(simplifiedTitle, rewrittenContent);

    // Extract real author from NewsData.io response
    const author = await this.extractRealAuthor(article);

    // Create authorDisplay field: use author if available, otherwise use source
    const authorDisplay = author || article.source_id;

    return {
      id: `newsdata-${Date.now()}-${index}`,
      title: simplifiedTitle,
      summary: rewrittenContent, // Use the full rewritten content as summary
      sourceUrl: article.link,
      source: article.source_id,
      author: author,
      authorDisplay: authorDisplay, // New field for UI display
      publishedAt: article.pubDate,
      imageUrl: imageUrl,
      category: this.determineCategory(article.title, article.description || ''),
      what: sections.what,
      impact: sections.impact,
      takeaways: sections.takeaways,
      whyThisMatters: sections.whyThisMatters
    };
  }

  /**
   * Extract real author from NewsData.io article using AI
   */
  private static async extractRealAuthor(article: NewsDataArticle): Promise<string | null> {
    
    // Try to get author from various possible fields first
    if (article.creator && article.creator.trim()) {
      return this.cleanAuthorName(article.creator);
    }
    
    if (article.author && article.author.trim()) {
      return this.cleanAuthorName(article.author);
    }
    
    // Try to extract author from content or description using regex first
    if (article.content) {
      const authorMatch = article.content.match(/(?:by|author|written by|byline)[:\s]+([^<\n\r]+)/i);
      if (authorMatch && authorMatch[1]) {
        return this.cleanAuthorName(authorMatch[1]);
      }
    }
    
    if (article.description) {
      const authorMatch = article.description.match(/(?:by|author|written by|byline)[:\s]+([^<\n\r]+)/i);
      if (authorMatch && authorMatch[1]) {
        return this.cleanAuthorName(authorMatch[1]);
      }
    }
    
    // If no author found in metadata, use AI to extract from content
    if (article.content && article.content.length > 100) {
      try {
        console.log('Using AI to extract author from content...');
        const author = await this.extractAuthorWithAI(article.content, article.title);
        if (author) {
          console.log('AI found author:', author);
          return this.cleanAuthorName(author);
        }
      } catch (error) {
        console.warn('AI author extraction failed:', error);
      }
    }
    
    // No author found
    return null;
  }

  /**
   * Use AI to extract author name from article content
   */
  private static async extractAuthorWithAI(content: string, title: string): Promise<string | null> {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 100,
        messages: [
          {
            role: 'system',
            content: 'You are an assistant that extracts author names from news articles. Look for the actual journalist or writer name, not the publication name. Return only the author name, nothing else. If no clear author is found, return "null".'
          },
          {
            role: 'user',
            content: `Extract the author name from this article:\n\nTitle: ${title}\n\nContent: ${content.substring(0, 2000)}`
          }
        ]
      });

      const author = response.choices[0]?.message?.content?.trim();
      if (author && author !== 'null' && author.length > 2 && author.length < 100) {
        return author;
      }
    } catch (error) {
      console.warn('AI author extraction failed:', error);
    }
    
    return null;
  }

  /**
   * Clean and format author name
   */
  private static cleanAuthorName(author: string): string {
    if (!author) return '';
    
    let cleanAuthor = author.trim();
    
    // Remove common prefixes
    cleanAuthor = cleanAuthor.replace(/^(by|author|written by|byline)[:\s]*/i, '');
    
    // Remove HTML tags
    cleanAuthor = cleanAuthor.replace(/<[^>]*>/g, '');
    
    // Remove common suffixes and extra info
    cleanAuthor = cleanAuthor.replace(/\s*(,.*|\(.*\)|\[.*\]|@.*|•.*).*$/, '');
    
    // Clean up whitespace
    cleanAuthor = cleanAuthor.replace(/\s+/g, ' ').trim();
    
    // If author is too long, truncate it
    if (cleanAuthor.length > 50) {
      cleanAuthor = cleanAuthor.substring(0, 47) + '...';
    }
    
    return cleanAuthor;
  }

  /**
   * Extract author from source or create meaningful fallback (for RSS feeds)
   */
  private static extractAuthorFromSource(source: string): string | null {
    if (!source) return null;
    
    // For RSS feeds, we don't have individual author names
    // Return null so the UI can fall back to showing the source name
    return null;
  }

  /**
   * Validate if URL is a valid image
   */
  private static isValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      console.log(`❌ Invalid image URL: ${url} (not a string or empty)`);
      return false;
    }
    
    // Check if it's a valid URL
    try {
      new URL(url);
    } catch {
      console.log(`❌ Invalid image URL: ${url} (not a valid URL)`);
      return false;
    }
    
    // Check if it's an image URL by extension
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const hasImageExtension = imageExtensions.some(ext => url.toLowerCase().includes(ext));
    
    // Check if it's from a known image service
    const imageServices = ['unsplash.com', 'images.unsplash.com', 'source.unsplash.com', 'via.placeholder.com', 'picsum.photos'];
    const isFromImageService = imageServices.some(service => url.includes(service));
    
    // Check if it's from a news/website that commonly serves images
    const newsImageDomains = [
      'securityweek.com', 'krebsonsecurity.com', 'bleepingcomputer.com', 
      'thehackernews.com', 'cisa.gov', 'ftc.gov', 'feedburner.com',
      'cdn.', 'img.', 'images.', 'static.', 'assets.', 'media.'
    ];
    const isFromNewsDomain = newsImageDomains.some(domain => url.includes(domain));
    
    // Check if it's from any news/tech domain (more permissive)
    const commonNewsDomains = [
      'securityweek', 'krebsonsecurity', 'bleepingcomputer', 
      'hackernews', 'cisa.gov', 'ftc.gov', 'feedburner',
      'news', 'tech', 'cyber', 'security'
    ];
    const isFromCommonNewsDomain = commonNewsDomains.some(domain => url.toLowerCase().includes(domain));
    
    // Check if URL contains common image indicators
    const hasImageIndicators = url.includes('image') || url.includes('photo') || url.includes('picture') || url.includes('thumb');
    
    const isValid = hasImageExtension || isFromImageService || isFromNewsDomain || isFromCommonNewsDomain || hasImageIndicators;
    
    if (isValid) {
      console.log(`✅ Image URL is valid: ${url}`);
    } else {
      console.log(`❌ Image URL rejected: ${url}`);
      console.log(`   - Has extension: ${hasImageExtension}`);
      console.log(`   - From image service: ${isFromImageService}`);
      console.log(`   - From news domain: ${isFromNewsDomain}`);
      console.log(`   - From common news domain: ${isFromCommonNewsDomain}`);
      console.log(`   - Has image indicators: ${hasImageIndicators}`);
    }
    
    return isValid;
  }

  /**
   * Determine article category
   */
  private static determineCategory(title: string, description: string): 'cybersecurity' | 'hacking' | 'general' {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('hack') || text.includes('attack') || text.includes('malware') || text.includes('ransomware')) {
      return 'hacking';
    }
    
    if (text.includes('cybersecurity') || text.includes('cyber security') || text.includes('data breach') || text.includes('vulnerability')) {
      return 'cybersecurity';
    }
    
    return 'general';
  }

  /**
   * Split text into chunks for processing
   */
  private static splitIntoChunks(text: string, maxChars = 6000): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
      let end = Math.min(i + maxChars, text.length);
      if (end < text.length) {
        // try to cut at sentence boundary
        const slice = text.slice(i, end);
        const lastPunct = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
        if (lastPunct > 0) end = i + lastPunct + 1;
      }
      chunks.push(text.slice(i, end));
      i = end;
    }
    return chunks;
  }

  /**
   * Rewrite a single chunk with AI
   */
  private static async rewriteChunk(chunk: string, index: number, total: number): Promise<string> {
      const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 2000, // generous so we don't cut mid-thought
        messages: [
          {
          role: 'system', 
          content: 'You rewrite cybersecurity articles in clear, non-technical language without losing meaning. Keep factual details; avoid jargon.' 
        },
        { 
          role: 'user', 
          content: `This is part ${index} of ${total} of an article. Rewrite this part clearly in plain English. Do NOT summarize; fully rewrite. Keep names, numbers, and facts accurate.\n\n${chunk}`
        }
      ]
    });
    return response.choices[0]?.message?.content?.trim() ?? chunk;
  }

  /**
   * Rewrite entire article with chunked AI processing to prevent truncation
   */
  private static async rewriteArticleWithAI(title: string, content: string): Promise<string> {
    try {
      console.log(`🤖 Rewriting article with chunked AI: "${title}"`);
      
      if (!content || content.trim().length === 0) {
        return content;
      }

      const chunks = this.splitIntoChunks(content);
      console.log(`📝 Split article into ${chunks.length} chunks`);
      
      const parts: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`🤖 Processing chunk ${i + 1}/${chunks.length}`);
        const rewrittenChunk = await this.rewriteChunk(chunks[i], i + 1, chunks.length);
        parts.push(rewrittenChunk);
      }
      
      // Join with double newlines to avoid mid-word merges
      const result = parts.join('\n\n').replace(/\s+\n/g, '\n');
      console.log(`✅ Article rewritten successfully (${result.length} chars)`);
      return result;
      
    } catch (error) {
      console.error(`❌ Article rewriting failed:`, error);
      return content; // Return original content if AI fails
    }
  }

  /**
   * Public function for full article simplification with chunking
   */
  public static async simplifyFullArticle(raw: string): Promise<string> {
    if (!raw) return '';
    const chunks = this.splitIntoChunks(raw);
    const parts: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      parts.push(await this.rewriteChunk(chunks[i], i + 1, chunks.length));
    }
    // Join with double newlines to avoid mid-word merges
    return parts.join('\n\n').replace(/\s+\n/g, '\n');
  }

  /**
   * Unified AI processing that generates both summary and sections in one call
   */
  private static async processArticleWithAI(articleContent: string): Promise<{
    summary: string;
    what: string;
    impact: string;
    takeaways: string;
    whyThisMatters: string;
  }> {
    if (!articleContent || articleContent.trim().length === 0) {
      return {
        summary: "No content available for this article.",
        what: "What happened: No details available.",
        impact: "Impact: Unable to determine the impact of this event.",
        takeaways: "Key takeaways: Stay informed about cybersecurity developments.",
        whyThisMatters: "Why this matters: Understanding cybersecurity helps protect your digital safety."
      };
    }

    try {
      console.log(`🤖 Processing article with unified AI: ${articleContent.substring(0, 100)}...`);
      
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an assistant that rewrites and summarizes cybersecurity articles for a general audience.
- Remove technical jargon and replace it with plain, everyday language.
- Keep all important facts, names, dates, and numbers accurate.
- Never cut off mid-word or mid-sentence.
- Always end with a logical, complete thought.
- Summaries must be coherent and self-contained, even if the original article is fragmented.
- Do not use ellipses ("...") unless they are part of a quoted phrase.
- Keep summaries concise (3–5 sentences), but ensure they cover the main points.
- Structure your response clearly and logically.
- After rewriting the summary, also generate these 4 short sections (1–2 sentences each):
  1. What happened
  2. Impact
  3. Key takeaways
  4. Why this matters

Please respond in this exact JSON format:
{
  "summary": "Your rewritten summary here",
  "what": "What happened: [Brief explanation]",
  "impact": "Impact: [How this affects people/security]",
  "takeaways": "Key takeaways: [Main points to remember]",
  "whyThisMatters": "Why this matters: [Why people should care]"
}`
          },
          {
            role: "user",
            content: `Rewrite and summarize this article in plain English, following the system rules above.
Article content: ${articleContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const aiResponse = response.choices[0]?.message?.content?.trim();
      if (!aiResponse) {
        throw new Error("AI returned empty response");
      }

      console.log(`🤖 AI response received: ${aiResponse.substring(0, 200)}...`);

      // Try to parse JSON response
      try {
        const parsed = JSON.parse(aiResponse);
        const result = {
          summary: parsed.summary || "Summary not available",
          what: parsed.what || "What happened: Details not available",
          impact: parsed.impact || "Impact: Unable to determine impact",
          takeaways: parsed.takeaways || "Key takeaways: Stay informed about cybersecurity",
          whyThisMatters: parsed.whyThisMatters || "Why this matters: Understanding cybersecurity helps protect your digital safety"
        };
        
        console.log(`✅ AI processing complete - Summary: ${result.summary.substring(0, 100)}...`);
        return result;
      } catch (parseError) {
        console.warn(`⚠️ JSON parsing failed, trying text parsing:`, parseError);
        
        // Fallback to text parsing if JSON fails
        const summaryMatch = aiResponse.match(/summary["\s]*:["\s]*"([^"]+)"/i) || 
                            aiResponse.match(/summary["\s]*:["\s]*([^,}]+)/i);
        const whatMatch = aiResponse.match(/what["\s]*:["\s]*"([^"]+)"/i) || 
                         aiResponse.match(/what["\s]*:["\s]*([^,}]+)/i);
        const impactMatch = aiResponse.match(/impact["\s]*:["\s]*"([^"]+)"/i) || 
                           aiResponse.match(/impact["\s]*:["\s]*([^,}]+)/i);
        const takeawaysMatch = aiResponse.match(/takeaways["\s]*:["\s]*"([^"]+)"/i) || 
                              aiResponse.match(/takeaways["\s]*:["\s]*([^,}]+)/i);
        const whyMatch = aiResponse.match(/whyThisMatters["\s]*:["\s]*"([^"]+)"/i) || 
                        aiResponse.match(/whyThisMatters["\s]*:["\s]*([^,}]+)/i);

        return {
          summary: summaryMatch ? summaryMatch[1].trim() : aiResponse.split('\n')[0] || "Summary not available",
          what: whatMatch ? whatMatch[1].trim() : "What happened: Details not available",
          impact: impactMatch ? impactMatch[1].trim() : "Impact: Unable to determine impact",
          takeaways: takeawaysMatch ? takeawaysMatch[1].trim() : "Key takeaways: Stay informed about cybersecurity",
          whyThisMatters: whyMatch ? whyMatch[1].trim() : "Why this matters: Understanding cybersecurity helps protect your digital safety"
        };
      }
    } catch (err: any) {
      console.error("❌ AI processing failed:", err);
      console.log(`⚠️ Falling back to template content`);
      
      return {
        summary: articleContent, // Don't truncate - let UI handle display
        what: "What happened: Details not available due to processing error",
        impact: "Impact: Unable to determine impact due to processing error",
        takeaways: "Key takeaways: Stay informed about cybersecurity developments",
        whyThisMatters: "Why this matters: Understanding cybersecurity helps protect your digital safety"
      };
    }
  }

  /**
   * Simplify text using OpenAI ChatGPT API (legacy method - now uses unified processing)
   */
  private static async simplifyWithAI(text: string): Promise<string> {
    if (!text || text.trim().length === 0) return "";

    try {
      const result = await this.processArticleWithAI(text);
      return result.summary;
    } catch (err: any) {
      console.error("❌ AI simplification failed:", err);
      return text; // fallback to original
    }
  }

  /**
   * Generate article sections (what, impact, takeaways, whyThisMatters) - now uses unified processing
   */
  private static async generateArticleSections(title: string, summary: string): Promise<{
    what: string;
    impact: string;
    takeaways: string;
    whyThisMatters: string;
  }> {
    console.log(`🔍 Generating sections for: "${title}"`);
    console.log(`📝 Summary length: ${summary ? summary.length : 0} characters`);
    
    const content = `${title}. ${summary}`.trim();
    
    try {
      // Use unified AI processing
      console.log(`🤖 Using unified AI processing for sections...`);
      const result = await this.processArticleWithAI(content);
      
        console.log(`✅ AI generated sections successfully:`, {
        what: result.what.substring(0, 50) + '...',
        impact: result.impact.substring(0, 50) + '...',
        takeaways: result.takeaways.substring(0, 50) + '...',
        whyThisMatters: result.whyThisMatters.substring(0, 50) + '...'
      });
      
      return {
        what: result.what,
        impact: result.impact,
        takeaways: result.takeaways,
        whyThisMatters: result.whyThisMatters
      };
    } catch (error) {
      console.warn(`❌ AI section generation failed:`, error);
    }
    
    // Fallback to templates
    console.log(`🔄 Using fallback templates for sections`);
    const fallbackSections = {
      what: `What happened: ${title}`,
      impact: `Impact: This event affects cybersecurity awareness and best practices.`,
      takeaways: `Key takeaways: Stay informed, follow best practices, and monitor new threats.`,
      whyThisMatters: `Why this matters: Understanding these events helps protect your digital safety.`
    };
    
    console.log(`📋 Fallback sections created:`, {
      what: fallbackSections.what.substring(0, 50) + '...',
      impact: fallbackSections.impact.substring(0, 50) + '...',
      takeaways: fallbackSections.takeaways.substring(0, 50) + '...',
      whyThisMatters: fallbackSections.whyThisMatters.substring(0, 50) + '...'
    });
    
    return fallbackSections;
  }

  /**
   * Generate sections using AI
   */
  private static async generateSectionsWithAI(content: string): Promise<{
    what: string;
    impact: string;
    takeaways: string;
    whyThisMatters: string;
  } | null> {
    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity expert who creates clear, simple explanations. For each article, provide exactly 4 sections in this format:\n\nWhat happened: [Brief explanation of the event]\nImpact: [How this affects people/security]\nKey takeaways: [Main points to remember]\nWhy this matters: [Why people should care about this]\n\nKeep each section concise (1-2 sentences) and easy to understand."
          },
          {
            role: "user",
            content: `Create sections for this cybersecurity article: ${content}`
          }
        ],
        temperature: 0.5,
        max_tokens: 400
      });

      const aiContent = response.choices[0]?.message?.content?.trim();
      if (!aiContent) {
        console.log(`❌ AI returned empty content`);
        return null;
      }

      console.log(`🤖 AI generated content:`, aiContent.substring(0, 200) + '...');

      // Parse the AI response
      const whatMatch = aiContent.match(/What happened:\s*(.+?)(?=\n|$)/i);
      const impactMatch = aiContent.match(/Impact:\s*(.+?)(?=\n|$)/i);
      const takeawaysMatch = aiContent.match(/Key takeaways:\s*(.+?)(?=\n|$)/i);
      const whyMatch = aiContent.match(/Why this matters:\s*(.+?)(?=\n|$)/i);

      const parsedSections = {
        what: whatMatch ? whatMatch[1].trim() : `What happened: ${content.split('.')[0]}`,
        impact: impactMatch ? impactMatch[1].trim() : `Impact: This event affects cybersecurity awareness and best practices.`,
        takeaways: takeawaysMatch ? takeawaysMatch[1].trim() : `Key takeaways: Stay informed, follow best practices, and monitor new threats.`,
        whyThisMatters: whyMatch ? whyMatch[1].trim() : `Why this matters: Understanding these events helps protect your digital safety.`
      };

      console.log(`✅ AI sections parsed successfully:`, {
        what: parsedSections.what.substring(0, 50) + '...',
        impact: parsedSections.impact.substring(0, 50) + '...',
        takeaways: parsedSections.takeaways.substring(0, 50) + '...',
        whyThisMatters: parsedSections.whyThisMatters.substring(0, 50) + '...'
      });

      return parsedSections;
    } catch (error) {
      console.error("AI section generation failed:", error);
      return null;
    }
  }

  /**
   * Generate fallback content when external sources fail
   */
  private static async generateFallbackContent(category: 'cybersecurity' | 'hacking' | 'general'): Promise<ProcessedArticle[]> {
    console.log(`🔄 Generating fallback content for category: ${category}`);
    
    // Generate 64 articles with varied content
    const fallbackArticles = [];
    const baseArticles = [
      {
        title: 'Cybersecurity Best Practices for 2024',
        summary: 'Essential security tips to protect your digital life. Learn about password management, two-factor authentication, and staying safe online.',
        sourceUrl: 'https://www.cisa.gov/be-cyber-smart',
        source: 'CISA',
        author: null,
        authorDisplay: 'CISA',
        imageUrl: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=400&fit=crop&crop=center',
        what: 'What happened: Cybersecurity threats are constantly evolving, and it\'s important to stay updated with the latest security practices.',
        impact: 'Impact: Following these practices helps protect your personal data and prevents cyber attacks.',
        takeaways: 'Key takeaways: Use strong passwords, enable two-factor authentication, and stay informed about security threats.',
        whyThisMatters: 'Understanding cybersecurity helps you stay safe online and protect your valuable information.'
      },
      {
        title: 'How to Protect Your Personal Data Online',
        summary: 'Simple steps to safeguard your personal information from cyber threats. Discover essential privacy tools and techniques.',
        sourceUrl: 'https://www.consumer.ftc.gov/articles',
        source: 'FTC',
        author: null,
        authorDisplay: 'FTC',
        imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop&crop=center',
        what: 'What happened: Personal data protection is more important than ever as cyber threats continue to increase.',
        impact: 'Impact: Protecting your data prevents identity theft and keeps your personal information secure.',
        takeaways: 'Key takeaways: Be careful with what you share online, use privacy settings, and monitor your accounts regularly.',
        whyThisMatters: 'Your personal data is valuable to cybercriminals, so protecting it is essential for your safety.'
      },
      {
        title: 'Understanding Phishing Attacks',
        summary: 'Learn how to identify and avoid phishing attempts that target your accounts. Stay one step ahead of cybercriminals.',
        sourceUrl: 'https://krebsonsecurity.com',
        source: 'KrebsOnSecurity',
        author: null,
        authorDisplay: 'KrebsOnSecurity',
        imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop&crop=center',
        what: 'What happened: Phishing attacks are becoming more sophisticated and targeting more people than ever before.',
        impact: 'Impact: Falling for phishing attacks can lead to stolen passwords, financial loss, and identity theft.',
        takeaways: 'Key takeaways: Never click suspicious links, verify sender identities, and report suspicious emails.',
        whyThisMatters: 'Phishing is one of the most common cyber threats, so knowing how to spot it is crucial.'
      },
      {
        title: 'Ransomware Protection Strategies',
        summary: 'Comprehensive guide to protecting your systems from ransomware attacks. Learn prevention techniques and recovery methods.',
        sourceUrl: 'https://www.nist.gov/cyberframework',
        source: 'NIST',
        author: null,
        authorDisplay: 'NIST',
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&crop=center',
        what: 'What happened: Ransomware attacks have increased dramatically, targeting businesses and individuals worldwide.',
        impact: 'Impact: Ransomware can encrypt your files and demand payment, causing significant financial and data loss.',
        takeaways: 'Key takeaways: Keep backups, update software regularly, and never pay ransom demands.',
        whyThisMatters: 'Ransomware can destroy your data and cost thousands of dollars in recovery efforts.'
      },
      {
        title: 'Secure Password Management',
        summary: 'Best practices for creating and managing strong passwords. Learn about password managers and multi-factor authentication.',
        sourceUrl: 'https://www.haveibeenpwned.com',
        source: 'HaveIBeenPwned',
        author: null,
        authorDisplay: 'HaveIBeenPwned',
        imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=400&fit=crop&crop=center',
        what: 'What happened: Weak passwords are the leading cause of security breaches and account compromises.',
        impact: 'Impact: Strong passwords protect your accounts from unauthorized access and data theft.',
        takeaways: 'Key takeaways: Use unique passwords, enable 2FA, and check if your accounts have been compromised.',
        whyThisMatters: 'Your passwords are the first line of defense against cyber attacks.'
      }
    ];

    // Generate 64 articles by cycling through base articles and adding variations
    for (let i = 0; i < 64; i++) {
      const baseArticle = baseArticles[i % baseArticles.length];
      const timeOffset = i * 60 * 60 * 1000; // 1 hour apart
      
      fallbackArticles.push({
        id: `fallback-${Date.now()}-${i + 1}`,
        title: `${baseArticle.title} ${i > 4 ? `- Part ${Math.floor(i / 5) + 1}` : ''}`,
        summary: baseArticle.summary,
        sourceUrl: baseArticle.sourceUrl,
        source: baseArticle.source,
        author: baseArticle.author,
        authorDisplay: baseArticle.authorDisplay,
        publishedAt: new Date(Date.now() - timeOffset).toISOString(),
        imageUrl: baseArticle.imageUrl,
        category: category,
        what: baseArticle.what,
        impact: baseArticle.impact,
        takeaways: baseArticle.takeaways,
        whyThisMatters: baseArticle.whyThisMatters
      });
    }

    // Process fallback articles with AI simplification
    const processedArticles = await Promise.all(
      fallbackArticles.map(async (article) => {
        try {
          // Generate sections for each fallback article
          const sections = await this.generateArticleSections(article.title, article.summary);
          
          // Simplify summary with AI
          const simplifiedSummary = await this.simplifyWithAI(article.summary);
          
          const processedArticle = {
            ...article,
            summary: simplifiedSummary,
            what: sections.what,
            impact: sections.impact,
            takeaways: sections.takeaways,
            whyThisMatters: sections.whyThisMatters
          };
          
          console.log(`🔍 Processed fallback article:`, {
            title: processedArticle.title,
            summary: processedArticle.summary.substring(0, 50) + '...',
            what: processedArticle.what.substring(0, 50) + '...',
            impact: processedArticle.impact.substring(0, 50) + '...',
            takeaways: processedArticle.takeaways.substring(0, 50) + '...',
            whyThisMatters: processedArticle.whyThisMatters.substring(0, 50) + '...'
          });
          
          return processedArticle;
        } catch (error) {
          console.error('Failed to process fallback article:', error);
          return article;
        }
      })
    );

    console.log(`✅ Generated ${processedArticles.length} fallback articles with full content`);
    return processedArticles;
  }

  /**
   * Deduplicate articles by title and URL
   */
  private static deduplicateArticles(articles: ProcessedArticle[]): ProcessedArticle[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      const key = `${article.title.toLowerCase()}-${article.sourceUrl}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Sort articles by published date (most recent first)
   */
  private static sortArticlesByDate(articles: ProcessedArticle[]): ProcessedArticle[] {
    return articles.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return dateB - dateA; // Most recent first
    });
  }

}
