// Unified News Service - integrates NewsData.io and RSS feeds

// AI processing has been moved to GitHub Actions
// The app now fetches pre-processed articles from Supabase
console.log("🤖 AI processing moved to GitHub Actions - fetching pre-processed articles from Supabase");

// Helper function to extract content from RSS items
function getItemBody(item: any): string {
  // prefer full-content RSS fields if present
  const encoded = (item['content:encoded'] || item.content || '').toString();
  const desc = (item.description || item.summary || item.contentSnippet || '').toString();
  const text = (encoded || desc || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text;
}

// CORS-safe fetch fallback for article pages using Jina Reader
async function fetchReadableText(url: string): Promise<string> {
  const hostless = url.replace(/^https?:\/\//i, '');
  const jinaUrl = `https://r.jina.ai/http://${hostless}`;
  const res = await fetch(jinaUrl, { method: 'GET' });
  if (!res.ok) throw new Error(`Jina fetch failed: ${res.status}`);
  const text = await res.text();
  // Jina returns readable markdown/text; collapse whitespace
  return text.replace(/\s+/g, ' ').trim();
}

// AI Details type for structured output
type AiDetails = { 
  summary: string; 
  whatHappened: string; 
  impact: string; 
  takeaways: string[] 
};

// AI summarizer with strict JSON schema
async function generateAiDetails(title: string, sourceUrl: string, body: string): Promise<AiDetails | null> {
  // If OPENAI key isn't configured, return null (no template text!)
  // Note: This function will be used in the GitHub Actions script, not client-side
  console.log("🤖 AI generation not available in client - using pre-processed data from Supabase");
  return null;
}

// Define ProcessedArticle interface locally to avoid import issues
export interface ProcessedArticle {
  id: string;
  title: string;
  sourceUrl: string;
  publishedAt: string; // ISO string
  source: string;
  rawContent: string;     // NEW: the plain text used for summarization
  summary: string | null;
  impact: string | null;
  takeaways: string | null;
  author: string | null;
  authorDisplay: string; // New field for UI display
  imageUrl: string | undefined;
  category: 'cybersecurity' | 'hacking' | 'general';
  what: string | null;
  whyThisMatters: string | null;
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
        if (response.status === 422) {
          console.warn(`NewsData.io validation error (422): Invalid request parameters or API quota exceeded`);
          return [];
        }
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
      
    } catch (error: any) {
      console.warn(`NewsData.io fetch failed with ${error?.response?.status || error}: ${JSON.stringify(error?.response?.data || {})}`);
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
      
      // Collect successful results and log skipped feeds
      let skippedFeeds = 0;
      rssResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.length === 0) {
            console.log(`⚠️ RSS feed ${RSS_FEEDS[index]} returned no articles (may be 404 or empty)`);
            skippedFeeds++;
          } else {
            console.log(`✅ RSS feed ${RSS_FEEDS[index]} returned ${result.value.length} articles`);
            allRssArticles.push(...result.value);
          }
        } else {
          console.warn(`❌ RSS feed ${RSS_FEEDS[index]} failed:`, result.reason);
          skippedFeeds++;
        }
      });
      
      if (skippedFeeds > 0) {
        console.log(`📊 RSS Summary: ${skippedFeeds} feeds skipped, ${allRssArticles.length} articles collected`);
      }
      
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
      
      // Try direct fetch first (works in Node.js/server-side)
      let xmlText = '';
      
      try {
        console.log(`🔍 Trying direct fetch: ${feedUrl}`);
        const response = await fetch(feedUrl);
        
        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`⚠️ RSS feed not found (404) for ${feedUrl}, skipping...`);
            return [];
          }
          if (response.status === 403) {
            console.warn(`⚠️ Direct fetch blocked (403) for ${feedUrl}, trying Jina...`);
            throw new Error(`Direct fetch blocked: ${response.status}`);
          }
          throw new Error(`RSS fetch failed: ${response.status}`);
        }
        
        xmlText = await response.text();
        console.log(`✅ Direct fetch successful - RSS feed response length: ${xmlText.length} characters`);
        console.log(`🔍 RSS feed preview: ${xmlText.substring(0, 200)}...`);
        
      } catch (directError) {
        const errorMessage = directError instanceof Error ? directError.message : 'Unknown error';
        console.warn(`❌ Direct fetch failed: ${errorMessage}`);
        
        // Try Jina Reader as fallback
        try {
          console.log(`🔍 Trying Jina Reader for RSS feed: ${feedUrl}`);
          xmlText = await fetchReadableText(feedUrl);
          console.log(`✅ Jina Reader successful - RSS feed response length: ${xmlText.length} characters`);
        } catch (jinaError) {
          const jinaErrorMessage = jinaError instanceof Error ? jinaError.message : 'Unknown error';
          console.warn(`❌ Jina Reader failed: ${jinaErrorMessage}`);
          throw new Error(`All fetch methods failed: ${errorMessage}, ${jinaErrorMessage}`);
        }
      }
      
      const articles = await this.parseRSSFeed(xmlText, feedUrl);
      console.log(`🔍 Parsed ${articles.length} articles from ${feedUrl}`);
      
      return articles;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`❌ Failed to fetch RSS feed ${feedUrl}:`, errorMessage);
      // Don't throw - just return empty array to continue processing other feeds
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
          // Extract raw content using the new helper
          let body = getItemBody({ 
            'content:encoded': this.extractXmlValue(itemXml, 'content:encoded'),
            content: this.extractXmlValue(itemXml, 'content'),
            description: description,
            summary: this.extractXmlValue(itemXml, 'summary'),
            contentSnippet: this.extractXmlValue(itemXml, 'contentSnippet')
          });
          
          // If content is too short, try to fetch full article text
          if (!body || body.length < 600) {
            try {
              console.log(`🔍 Content too short (${body.length} chars), fetching full article: ${link}`);
              const fullText = await fetchReadableText(link);
              if (fullText && fullText.length > body.length) {
                body = fullText;
                console.log(`✅ Fetched full article text: ${body.length} chars`);
              }
            } catch (error) {
              console.warn(`⚠️ Failed to fetch full article text: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          
          // Trim to ~6000 chars to keep token usage sane
          const promptBody = body.slice(0, 6000);
          
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
          }
          
          // Generate AI details using the new structured approach
          const ai = await generateAiDetails(title, link, promptBody);
          
          // Create authorDisplay field: use author if available, otherwise use source
          const author = this.extractAuthorFromSource(this.getSourceName(feedUrl));
          let authorDisplay = author || this.getSourceName(feedUrl);
          
          const article: ProcessedArticle = {
            id: '', // Let Supabase auto-generate the ID
            title: this.cleanText(title),
            sourceUrl: link,
            publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            source: this.getSourceName(feedUrl),
            rawContent: body,                             // store the text we used
            summary: ai?.summary ?? null,                 // if null, leave null
            impact: ai?.impact ?? null,
            takeaways: ai?.takeaways?.join(" • ") ?? null, // if you store as text; else keep as array if DB supports jsonb
            author: author,
            authorDisplay: authorDisplay,
            imageUrl: imageUrl,
            category: this.determineCategory(title, description),
            what: ai?.whatHappened ?? null,
            whyThisMatters: null // Not used in new structure
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
          const description = this.extractXmlValue(firstItem, 'description') || null;
          
          const cleanTitle = this.cleanText(title);
          const cleanDesc = this.cleanText(description || '');
          
          const fallbackSummary = cleanDesc || '';
          const sections = await this.generateArticleSections(cleanTitle, fallbackSummary);
          
          // Create authorDisplay field for fallback article
          const author = this.extractAuthorFromSource(this.getSourceName(feedUrl));
          const authorDisplay = author || this.getSourceName(feedUrl);
          
          const fallbackArticle: ProcessedArticle = {
            id: '', // Let Supabase auto-generate the ID
            title: cleanTitle,
            sourceUrl: link,
            publishedAt: new Date().toISOString(),
            source: this.getSourceName(feedUrl),
            rawContent: fallbackSummary || '', // Use fallback summary as raw content
            summary: null, // No AI summary available
            impact: null,
            takeaways: null,
            author: author,
            authorDisplay: authorDisplay,
            imageUrl: undefined,
            category: this.determineCategory(title, description || ''),
            what: null,
            whyThisMatters: null
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
      console.log(`⚠️ No sufficient content available, returning empty string`);
      rewrittenContent = '';
    }
    
    // Final safety check - if no content, return empty string
    if (!rewrittenContent || rewrittenContent.trim().length === 0) {
      console.log(`🔄 Final safety check: no content available, returning empty string`);
      rewrittenContent = '';
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
      id: '', // Let Supabase auto-generate the ID
      title: simplifiedTitle,
      sourceUrl: article.link,
      publishedAt: article.pubDate,
      source: article.source_id,
      rawContent: fullContent, // Store the original content
      summary: rewrittenContent || null, // Use the full rewritten content as summary or null
      impact: sections.impact || null,
      takeaways: sections.takeaways || null,
      author: author,
      authorDisplay: authorDisplay,
      imageUrl: imageUrl,
      category: this.determineCategory(article.title, article.description || ''),
      what: sections.what || null,
      whyThisMatters: sections.whyThisMatters || null
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
   * Extract author from content using simple regex patterns
   * AI processing has been moved to GitHub Actions
   */
  private static async extractAuthorWithAI(content: string, title: string): Promise<string | null> {
    // Simple regex-based author extraction since AI processing moved to GitHub Actions
    const authorMatch = content.match(/(?:by|author|written by|byline)[:\s]+([^<\n\r]+)/i);
    if (authorMatch && authorMatch[1]) {
      return this.cleanAuthorName(authorMatch[1]);
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
   * Simple text processing since AI processing moved to GitHub Actions
   */
  private static async rewriteChunk(chunk: string, index: number, total: number): Promise<string> {
    // Simple text cleaning since AI processing moved to GitHub Actions
    return this.cleanText(chunk);
  }

  /**
   * Simple text processing since AI processing moved to GitHub Actions
   */
  private static async rewriteArticleWithAI(title: string, content: string): Promise<string> {
    console.log(`📝 Processing article text: "${title}"`);
    
    if (!content || content.trim().length === 0) {
      return content;
    }

    // Simple text cleaning since AI processing moved to GitHub Actions
    const cleanedContent = this.cleanText(content);
    console.log(`✅ Article processed successfully (${cleanedContent.length} chars)`);
    return cleanedContent;
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
   * Process article data from Supabase - no AI processing, just return what's available
   */
  private static async processArticleWithAI(article: any): Promise<{
    summary: string | null;
    what: string | null;
    impact: string | null;
    takeaways: string | null;
    whyThisMatters: string | null;
  }> {
    // Simply return the data from Supabase without any fallback text
    return {
      summary: article.summary || null,
      what: article.what || null,
      impact: article.impact || null,
      takeaways: article.takeaways || null,
      whyThisMatters: article.why_this_matters || null
    };
  }

  /**
   * Simple text processing since AI processing moved to GitHub Actions
   */
  private static async simplifyWithAI(text: string): Promise<string> {
    if (!text || text.trim().length === 0) return "";

    try {
      const result = await this.processArticleWithAI({ summary: text, what: null, impact: null, takeaways: null, why_this_matters: null });
      return result.summary || text;
    } catch (err: any) {
      console.error("❌ Text processing failed:", err);
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
      const result = await this.processArticleWithAI({ summary, what: null, impact: null, takeaways: null, why_this_matters: null });
      
        console.log(`✅ AI generated sections successfully:`, {
        what: result.what ? result.what.substring(0, 50) + '...' : 'null',
        impact: result.impact ? result.impact.substring(0, 50) + '...' : 'null',
        takeaways: result.takeaways ? result.takeaways.substring(0, 50) + '...' : 'null',
        whyThisMatters: result.whyThisMatters ? result.whyThisMatters.substring(0, 50) + '...' : 'null'
      });
      
      return {
        what: result.what || '',
        impact: result.impact || '',
        takeaways: result.takeaways || '',
        whyThisMatters: result.whyThisMatters || ''
      };
    } catch (error) {
      console.warn(`❌ AI section generation failed:`, error);
    }
    
    // Return empty strings for all fields if AI generation failed
    console.log(`🔄 AI generation failed, returning empty strings for all fields`);
    return {
      what: '',
      impact: '',
      takeaways: '',
      whyThisMatters: ''
    };
  }

  /**
   * Generate sections using simple templates since AI processing moved to GitHub Actions
   */
  private static async generateSectionsWithAI(content: string): Promise<{
    what: string;
    impact: string;
    takeaways: string;
    whyThisMatters: string;
  } | null> {
    try {
      console.log(`📝 Generating sections for content: ${content.substring(0, 100)}...`);
      
      // Return null since AI processing moved to GitHub Actions
      console.log(`🔄 AI processing moved to GitHub Actions, returning null for all fields`);
      return null;
    } catch (error) {
      console.error("Section generation failed:", error);
      return null;
    }
  }

  /**
   * Generate fallback content when external sources fail
   */
  private static async generateFallbackContent(category: 'cybersecurity' | 'hacking' | 'general'): Promise<ProcessedArticle[]> {
    console.log(`🔄 No fallback content generated - returning empty array for category: ${category}`);
    
    // Return empty array instead of hardcoded content
    return [];
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
