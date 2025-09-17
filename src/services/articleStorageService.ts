import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProcessedArticle } from './newsService';
import { getArticlesToArchive, getRecentArticles, sortArticlesByDate } from '../utils/dateUtils';

const ARTICLES_STORAGE_KEY = '@cybersimply_articles';
const ARTICLES_METADATA_KEY = '@cybersimply_articles_metadata';

interface ArticlesMetadata {
  totalArticles: number;
  lastUpdated: Date;
  oldestArticleDate: Date;
  newestArticleDate: Date;
  categories: string[];
}

export class ArticleStorageService {
  /**
   * Save new articles to local storage, merging with existing ones
   */
  static async saveArticles(newArticles: ProcessedArticle[]): Promise<void> {
    try {
      // Get existing articles
      const existingArticles = await this.getArticles();
      
      // Merge new articles with existing ones, avoiding duplicates
      const mergedArticles = this.mergeArticles(existingArticles, newArticles);
      
      // Save merged articles
      await AsyncStorage.setItem(ARTICLES_STORAGE_KEY, JSON.stringify(mergedArticles));
      
      // Update metadata
      await this.updateMetadata(mergedArticles);
      
      console.log(`ArticleStorage: Saved ${newArticles.length} new articles. Total: ${mergedArticles.length}`);
    } catch (error) {
      console.error('ArticleStorage: Failed to save articles:', error);
      throw error;
    }
  }

  /**
   * Get all stored articles
   */
  static async getArticles(): Promise<ProcessedArticle[]> {
    try {
      console.log('ArticleStorage: Getting articles from storage...');
      const articlesJson = await AsyncStorage.getItem(ARTICLES_STORAGE_KEY);
      
      if (articlesJson) {
        const articles = JSON.parse(articlesJson);
        console.log(`ArticleStorage: Found ${articles.length} articles in storage`);
        
        // Ensure publishedAt is a string (no need to convert to Date object)
        const processedArticles = articles.map((article: any) => ({
          ...article,
          publishedAt: typeof article.publishedAt === 'string' 
            ? article.publishedAt 
            : new Date(article.publishedAt).toISOString()
        }));
        
        console.log(`ArticleStorage: Returning ${processedArticles.length} processed articles`);
        return processedArticles;
      }
      
      console.log('ArticleStorage: No articles found in storage');
      return [];
    } catch (error) {
      console.error('ArticleStorage: Failed to get articles:', error);
      return [];
    }
  }

  /**
   * Get articles with pagination for infinite scrolling
   */
  static async getArticlesPaginated(page: number, pageSize: number = 20): Promise<{
    articles: ProcessedArticle[];
    hasMore: boolean;
    totalCount: number;
  }> {
    try {
      const allArticles = await this.getArticles();
      const startIndex = page * pageSize;
      const endIndex = startIndex + pageSize;
      const articles = allArticles.slice(startIndex, endIndex);
      
      return {
        articles,
        hasMore: endIndex < allArticles.length,
        totalCount: allArticles.length
      };
    } catch (error) {
      console.error('ArticleStorage: Failed to get paginated articles:', error);
      return { articles: [], hasMore: false, totalCount: 0 };
    }
  }

  /**
   * Get articles by category
   */
  static async getArticlesByCategory(category: string): Promise<ProcessedArticle[]> {
    try {
      const allArticles = await this.getArticles();
      return allArticles.filter(article => article.category === category);
    } catch (error) {
      console.error('ArticleStorage: Failed to get articles by category:', error);
      return [];
    }
  }

  /**
   * Search articles by query
   */
  static async searchArticles(query: string): Promise<ProcessedArticle[]> {
    try {
      const allArticles = await this.getArticles();
      const searchTerm = query.toLowerCase();
      
      return allArticles.filter(article => 
        article.title.toLowerCase().includes(searchTerm) ||
        article.summary.toLowerCase().includes(searchTerm) ||
        article.category.toLowerCase().includes(searchTerm) ||
        article.what.toLowerCase().includes(searchTerm) ||
        article.impact.toLowerCase().includes(searchTerm) ||
        article.takeaways.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('ArticleStorage: Failed to search articles:', error);
      return [];
    }
  }

  /**
   * Get recent articles (not archived, newer than specified days)
   */
  static async getRecentArticles(days: number = 7): Promise<ProcessedArticle[]> {
    try {
      const allArticles = await this.getArticles();
      const recentArticles = getRecentArticles(allArticles, days);
      
      // Sort recent articles by date (newest first)
      return sortArticlesByDate(recentArticles);
    } catch (error) {
      console.error('ArticleStorage: Failed to get recent articles:', error);
      return [];
    }
  }

  /**
   * Get archived articles (older than specified days)
   */
  static async getArchivedArticles(days: number = 7): Promise<ProcessedArticle[]> {
    try {
      const allArticles = await this.getArticles();
      const archivedArticles = getArticlesToArchive(allArticles, days);
      
      // Sort archived articles by date (newest first)
      return sortArticlesByDate(archivedArticles);
    } catch (error) {
      console.error('ArticleStorage: Failed to get archived articles:', error);
      return [];
    }
  }

  /**
   * Get articles metadata
   */
  static async getMetadata(): Promise<ArticlesMetadata | null> {
    try {
      const metadataJson = await AsyncStorage.getItem(ARTICLES_METADATA_KEY);
      if (metadataJson) {
        const metadata = JSON.parse(metadataJson);
        return {
          ...metadata,
          lastUpdated: new Date(metadata.lastUpdated),
          oldestArticleDate: new Date(metadata.oldestArticleDate),
          newestArticleDate: new Date(metadata.newestArticleDate)
        };
      }
      return null;
    } catch (error) {
      console.error('ArticleStorage: Failed to get metadata:', error);
      return null;
    }
  }

  /**
   * Clear all stored articles (useful for testing or reset)
   */
  static async clearAllArticles(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ARTICLES_STORAGE_KEY);
      await AsyncStorage.removeItem(ARTICLES_METADATA_KEY);
      console.log('ArticleStorage: All articles cleared');
    } catch (error) {
      console.error('ArticleStorage: Failed to clear articles:', error);
      throw error;
    }
  }

  /**
   * Remove duplicate articles from storage
   */
  static async removeDuplicates(): Promise<number> {
    try {
      const articles = await this.getArticles();
      const uniqueArticles = this.removeDuplicateArticles(articles);
      const duplicatesRemoved = articles.length - uniqueArticles.length;
      
      if (duplicatesRemoved > 0) {
        await AsyncStorage.setItem(ARTICLES_STORAGE_KEY, JSON.stringify(uniqueArticles));
        await this.updateMetadata(uniqueArticles);
        console.log(`ArticleStorage: Removed ${duplicatesRemoved} duplicate articles`);
      }
      
      return duplicatesRemoved;
    } catch (error) {
      console.error('ArticleStorage: Failed to remove duplicates:', error);
      return 0;
    }
  }

  /**
   * Remove duplicate articles from an array
   */
  private static removeDuplicateArticles(articles: ProcessedArticle[]): ProcessedArticle[] {
    const seen = new Map<string, ProcessedArticle>();
    
    for (const article of articles) {
      // Create a unique key based on multiple criteria
      const key = this.createArticleKey(article);
      
      if (!seen.has(key)) {
        seen.set(key, article);
      } else {
        // Keep the newer article if there's a duplicate
        const existing = seen.get(key)!;
        const existingDate = new Date(existing.publishedAt);
        const newDate = new Date(article.publishedAt);
        
        if (newDate > existingDate) {
          seen.set(key, article);
        }
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Create a unique key for an article based on multiple criteria
   */
  private static createArticleKey(article: ProcessedArticle): string {
    // Use title as primary key (most reliable for deduplication)
    const titleKey = article.title.toLowerCase().trim();
    
    // If sourceUrl is available, combine with title for better uniqueness
    if (article.sourceUrl) {
      return `${titleKey}|${article.sourceUrl}`;
    }
    
    // Fallback to title only
    return titleKey;
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    totalArticles: number;
    storageSize: string;
    oldestArticle: Date | null;
    newestArticle: Date | null;
  }> {
    try {
      const articles = await this.getArticles();
      const metadata = await this.getMetadata();
      
      if (articles.length === 0) {
        return {
          totalArticles: 0,
          storageSize: '0 KB',
          oldestArticle: null,
          newestArticle: null
        };
      }

      // Calculate storage size
      const articlesJson = JSON.stringify(articles);
      const storageSizeBytes = new Blob([articlesJson]).size;
      const storageSizeKB = (storageSizeBytes / 1024).toFixed(2);

      return {
        totalArticles: articles.length,
        storageSize: `${storageSizeKB} KB`,
        oldestArticle: metadata?.oldestArticleDate || null,
        newestArticle: metadata?.newestArticleDate || null
      };
    } catch (error) {
      console.error('ArticleStorage: Failed to get storage stats:', error);
      return {
        totalArticles: 0,
        storageSize: '0 KB',
        oldestArticle: null,
        newestArticle: null
      };
    }
  }

  /**
   * Merge new articles with existing ones, avoiding duplicates
   */
  private static mergeArticles(existing: ProcessedArticle[], newArticles: ProcessedArticle[]): ProcessedArticle[] {
    const merged = [...existing];
    let duplicatesFound = 0;
    
    for (const newArticle of newArticles) {
      // Check if article already exists by multiple criteria to prevent duplicates
      const exists = merged.some(existingArticle => {
        // Check by ID first (most reliable)
        if (existingArticle.id === newArticle.id) {
          return true;
        }
        
        // Check by title (case-insensitive)
        if (existingArticle.title.toLowerCase() === newArticle.title.toLowerCase()) {
          return true;
        }
        
        // Check by sourceUrl if available
        if (existingArticle.sourceUrl && newArticle.sourceUrl && existingArticle.sourceUrl === newArticle.sourceUrl) {
          return true;
        }
        
        // Check by summary similarity (first 100 characters)
        if (existingArticle.summary && newArticle.summary) {
          const existingStart = existingArticle.summary.substring(0, 100).toLowerCase();
          const newStart = newArticle.summary.substring(0, 100).toLowerCase();
          if (existingStart === newStart && existingStart.length > 50) {
            return true;
          }
        }
        
        return false;
      });
      
      if (!exists) {
        merged.push(newArticle);
      } else {
        duplicatesFound++;
        console.log(`ArticleStorage: Skipped duplicate article: "${newArticle.title}"`);
      }
    }
    
    if (duplicatesFound > 0) {
      console.log(`ArticleStorage: Skipped ${duplicatesFound} duplicate articles`);
    }
    
    // Sort by published date (newest first)
    return merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  /**
   * Update metadata when articles change
   */
  private static async updateMetadata(articles: ProcessedArticle[]): Promise<void> {
    try {
      if (articles.length === 0) {
        await AsyncStorage.removeItem(ARTICLES_METADATA_KEY);
        return;
      }

      const dates = articles
        .map(article => new Date(article.publishedAt))
        .filter(date => !isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      const categories = [...new Set(articles.map(article => article.category))];

      const metadata: ArticlesMetadata = {
        totalArticles: articles.length,
        lastUpdated: new Date(),
        oldestArticleDate: dates[0] || new Date(),
        newestArticleDate: dates[dates.length - 1] || new Date(),
        categories
      };

      await AsyncStorage.setItem(ARTICLES_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('ArticleStorage: Failed to update metadata:', error);
    }
  }
}
