export interface NewsApiArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

export interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

import { supabaseArticleService } from './supabaseArticleService';
import { supabaseArticleServiceProduction } from './supabaseArticleServiceProduction';
import { testSupabaseConnection } from './supabaseClientProduction';

export class NewsApiService {
  private static readonly API_KEY = process.env.EXPO_PUBLIC_NEWS_API_KEY || 'your_newsapi_key_here';
  private static readonly BASE_URL = 'https://newsapi.org/v2/everything';
  
  // Cybersecurity search queries for different categories
  private static readonly SEARCH_QUERIES = {
    cybersecurity: 'cybersecurity OR "cyber security" OR "data breach" OR "security vulnerability"',
    hacking: 'hacking OR "cyber attack" OR "malware" OR "ransomware" OR "phishing"',
    general: 'technology security OR "privacy protection" OR "online safety"'
  };

  static async fetchNewsByCategory(category: 'cybersecurity' | 'hacking' | 'general', page: number = 1): Promise<NewsApiArticle[]> {
    try {
      console.log(`🔍 [NewsAPI] Fetching ${category} news from Supabase (page ${page})...`);
      
      // Test Supabase connection first
      const connectionTest = await testSupabaseConnection();
      if (!connectionTest.success) {
        console.warn(`⚠️ [NewsAPI] Supabase connection failed: ${connectionTest.error}`);
        console.log(`🔄 [NewsAPI] Using fallback articles for ${category}`);
        return this.getFallbackArticles(category);
      }
      
      // Query Supabase for articles by category using production service
      const supabaseResult = await supabaseArticleServiceProduction.getArticles({
        category: category,
        limit: 10,
        offset: (page - 1) * 10
      });
      
      if (supabaseResult.success && supabaseResult.data && supabaseResult.data.articles.length > 0) {
        console.log(`✅ [NewsAPI] Found ${supabaseResult.data.articles.length} ${category} articles in Supabase`);
        // Convert Supabase articles to NewsAPI format for compatibility
        return supabaseResult.data.articles.map(article => ({
          source: { id: article.source || 'unknown', name: article.source || 'Unknown' },
          author: article.author,
          title: article.title,
          description: article.summary || '',
          url: article.source_url || '',
          urlToImage: article.image_url,
          publishedAt: article.published_at || new Date().toISOString(),
          content: null
        }));
      }
      
      console.log(`⚠️ [NewsAPI] No ${category} articles found in Supabase, using fallback articles`);
      return this.getFallbackArticles(category);
      
    } catch (error) {
      console.error(`❌ [NewsAPI] Error fetching ${category} news from Supabase:`, error);
      console.log(`🔄 [NewsAPI] Using fallback articles for ${category}`);
      return this.getFallbackArticles(category);
    }
  }

  static async fetchLatestNews(page: number = 1): Promise<NewsApiArticle[]> {
    try {
      console.log(`📰 [NewsAPI] Fetching latest news from Supabase (page ${page})...`);
      
      // Test Supabase connection first
      const connectionTest = await testSupabaseConnection();
      if (!connectionTest.success) {
        console.warn(`⚠️ [NewsAPI] Supabase connection failed: ${connectionTest.error}`);
        console.log(`🔄 [NewsAPI] Using fallback articles`);
        return this.getFallbackArticles('cybersecurity');
      }
      
      // Query Supabase directly for articles using production service
      const supabaseResult = await supabaseArticleServiceProduction.getArticles({
        limit: 20,
        offset: (page - 1) * 10
      });
      
      if (supabaseResult.success && supabaseResult.data && supabaseResult.data.articles.length > 0) {
        console.log(`✅ [NewsAPI] Found ${supabaseResult.data.articles.length} articles in Supabase`);
        // Convert Supabase articles to NewsAPI format for compatibility
        return supabaseResult.data.articles.map(article => ({
          source: { id: article.source || 'unknown', name: article.source || 'Unknown' },
          author: article.author,
          title: article.title,
          description: article.summary || '',
          url: article.source_url || '',
          urlToImage: article.image_url,
          publishedAt: article.published_at || new Date().toISOString(),
          content: null
        }));
      }
      
      console.log('⚠️ [NewsAPI] No articles found in Supabase, using fallback articles');
      return this.getFallbackArticles('cybersecurity');
      
    } catch (error) {
      console.error('❌ [NewsAPI] Error fetching latest news from Supabase:', error);
      console.log('🔄 [NewsAPI] Using fallback articles');
      return this.getFallbackArticles('cybersecurity');
    }
  }

  private static getFallbackArticles(category: string): NewsApiArticle[] {
    // Return some fallback articles with working URLs and proper images
    const baseUrls = {
      cybersecurity: 'https://www.cisa.gov/be-cyber-smart',
      hacking: 'https://krebsonsecurity.com',
      general: 'https://www.consumer.ftc.gov/articles'
    };

    const baseUrl = baseUrls[category as keyof typeof baseUrls] || baseUrls.general;
    
    const fallbackArticles: NewsApiArticle[] = [
      {
        source: { id: 'fallback', name: 'CyberSimply' },
        author: null,
        title: 'Cybersecurity Best Practices for 2024',
        description: 'Essential security tips to protect your digital life in the new year.',
        url: `${baseUrl}/cybersecurity-best-practices`,
        urlToImage: 'https://via.placeholder.com/400x200/2196F3/ffffff?text=Cybersecurity+Best+Practices',
        publishedAt: new Date().toISOString(),
        content: 'Learn the latest cybersecurity best practices...'
      },
      {
        source: { id: 'fallback', name: 'CyberSimply' },
        author: null,
        title: 'How to Protect Your Personal Data Online',
        description: 'Simple steps to safeguard your personal information from cyber threats.',
        url: `${baseUrl}/protect-personal-data`,
        urlToImage: 'https://via.placeholder.com/400x200/4CAF50/ffffff?text=Protect+Personal+Data',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        content: 'Your personal data is valuable to cybercriminals...'
      },
      {
        source: { id: 'fallback', name: 'CyberSimply' },
        author: null,
        title: 'Understanding Phishing Attacks',
        description: 'Learn how to identify and avoid phishing attempts that target your accounts.',
        url: `${baseUrl}/phishing-attacks`,
        urlToImage: 'https://via.placeholder.com/400x200/FF9800/ffffff?text=Phishing+Attacks',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        content: 'Phishing attacks are becoming more sophisticated...'
      },
      {
        source: { id: 'fallback', name: 'CyberSimply' },
        author: null,
        title: 'Password Security: Create Strong Passwords',
        description: 'Learn how to create and manage strong passwords to protect your online accounts.',
        url: `${baseUrl}/password-security`,
        urlToImage: 'https://via.placeholder.com/400x200/9C27B0/ffffff?text=Password+Security',
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        content: 'Strong passwords are your first line of defense...'
      },
      {
        source: { id: 'fallback', name: 'CyberSimply' },
        author: null,
        title: 'Two-Factor Authentication: Why You Need It',
        description: 'Two-factor authentication adds an extra layer of security to your accounts.',
        url: `${baseUrl}/two-factor-authentication`,
        urlToImage: 'https://via.placeholder.com/400x200/FF5722/ffffff?text=Two-Factor+Auth',
        publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        content: 'Two-factor authentication prevents unauthorized access...'
      }
    ];

    return fallbackArticles;
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Store articles in Supabase for caching
   */
  private static async storeArticlesInSupabase(articles: NewsApiArticle[]): Promise<void> {
    try {
      console.log('💾 Storing articles in Supabase for caching...');
      
      // Convert NewsAPI articles to ProcessedArticle format
      const processedArticles = articles.map((article, index) => 
        this.convertToProcessedArticle(article, index)
      );
      
      const result = await supabaseArticleService.storeArticles(processedArticles);
      
      if (result.success) {
        console.log(`✅ Stored ${result.storedCount} articles in Supabase`);
      } else {
        console.warn(`⚠️ Failed to store articles in Supabase: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error storing articles in Supabase:', error);
    }
  }

  // Convert NewsAPI article to our ProcessedArticle format
  static convertToProcessedArticle(article: NewsApiArticle, index: number): any {
    const category = this.determineCategory(article.title, article.description);
    
    
    // Create authorDisplay field: use author if available, otherwise use source name
    const authorDisplay = article.author && article.author.trim().length > 0
      ? article.author
      : article.source.name;
    
    return {
      id: `newsapi-${Date.now()}-${index}`,
      title: article.title,
      summary: article.description || '', // Use empty string instead of fake text
      sourceUrl: article.url,
      source: article.source.name,
      author: article.author || null,
      authorDisplay: authorDisplay, // New field for UI display
      publishedAt: article.publishedAt,
      imageUrl: article.urlToImage, // This is the real thumbnail from NewsAPI
      category: category,
      what: '', // No fake content
      impact: '', // No fake content
      takeaways: '', // No fake content
      whyThisMatters: '' // No fake content
    };
  }

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
}
