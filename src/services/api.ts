import { RealNewsService } from './realNewsService';
import { ImageService } from './imageService';
import { NewsApiService } from './newsApiService';
import { UnifiedNewsService } from './unifiedNewsService';

/**
 * NewsService Configuration
 * 
 * CURRENT SETUP: Gemini API calls disabled to prevent errors
 * - Article summarization: Returns original content (no API calls)
 * - News generation: Uses RealNewsService for reliable content
 * - Image processing: Uses local ImageService
 * 
 * To re-enable AI summarization:
 * 1. Uncomment the Gemini API code in summarizeArticle method
 * 2. Ensure GEMINI_API_KEY is valid
 * 3. Test API connectivity
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export class NewsService {
  static async fetchNewsFromAPI(page: number = 1): Promise<any[]> {
    console.log('=== NEWS SERVICE DEBUG ===');
    console.log('Fetching news from unified sources...');

    try {
      // Use the new unified news service
      console.log('=== CALLING UNIFIED SERVICE ===');
      console.log('Calling UnifiedNewsService.getArticles...');
      const articles = await UnifiedNewsService.getArticles('cybersecurity');
      console.log('UnifiedNewsService returned:', articles.length, 'articles');
      
      if (articles.length > 0) {
        console.log(`✅ SUCCESS: Fetched ${articles.length} articles from unified sources`);
        console.log('First article sample:', {
          title: articles[0].title,
          summary: articles[0].summary,
          imageUrl: articles[0].imageUrl
        });
        return articles;
      } else {
        console.log('❌ UnifiedNewsService returned 0 articles - no real sources available');
        return []; // Return empty array instead of fallback
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Unified news service failed:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      } else {
        console.error('Unified news service failed:', error);
        console.error('Error details: Unknown error type');
      }
      console.log('❌ No real sources available - returning empty array');
      return []; // Return empty array instead of fallback
    }
  }

  static async loadMoreNews(page: number): Promise<any[]> {
    console.log('Loading more news from unified sources...');
    
    try {
      // Use the new unified news service for different categories
      const categories: ('cybersecurity' | 'hacking' | 'general')[] = ['hacking', 'general'];
      const category = categories[(page - 1) % categories.length];
      
      const articles = await UnifiedNewsService.getArticles(category);
      
      if (articles.length > 0) {
        console.log(`Successfully fetched ${articles.length} more articles from unified sources`);
        return articles;
      }
    } catch (error) {
      console.warn('Unified news service failed for loadMore:', error);
    }
    
    // No fallback - return empty array if no real sources available
    console.log('❌ No real sources available for loadMore - returning empty array');
    return [];
  }

  static async searchWebForNews(): Promise<any[]> {
    console.log('Using RealNewsService for web news');
    return RealNewsService.generateRealisticNews();
  }

  static async summarizeArticle(content: string): Promise<string> {
    try {
      // Disable Gemini API calls to avoid errors - return content directly
      console.log('Article summarization disabled - returning original content');
      return content;
      
      // Original Gemini API code (disabled):
      /*
      if (!GEMINI_API_KEY) {
        console.error('Gemini API key is missing');
        return content;
      }

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Summarize this cybersecurity article in simple terms for non-technical people: ' + content
            }]
          }]
        }),
      });

      if (!response.ok) {
        throw new Error('Gemini API error: ' + response.status);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || content;
      */
    } catch (error) {
      console.error('Error summarizing article:', error);
      return content;
    }
  }

  static async generateFreshCybersecurityNews(): Promise<any[]> {
    // Use real news service instead of unreliable AI generation
    return RealNewsService.generateRealisticNews();
  }

  static async generateOlderCybersecurityNews(): Promise<any[]> {
    // Use real news service for additional content
    return RealNewsService.generateMoreNews();
  }

  static getSampleArticles(): any[] {
    return RealNewsService.generateRealisticNews();
  }

  // Helper method to process articles with proper images
  static processArticlesWithImages(articles: any[]): any[] {
    return articles.map((article, index) => ({
      ...article,
      imageUrl: ImageService.getCategoryBasedImage(article.title, article.category),
      imageAttribution: ImageService.getImageAttribution(ImageService.getCategoryBasedImage(article.title, article.category))
    }));
  }
}
