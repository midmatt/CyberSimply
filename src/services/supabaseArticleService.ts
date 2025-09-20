import { supabase } from './supabaseClient';
import { Database } from './supabaseClient';
import { TABLES, RPC_FUNCTIONS } from '../constants/supabaseConfig';
import { ProcessedArticle } from './newsService';
import { v4 as uuidv4 } from 'uuid';

type Article = Database['public']['Tables']['articles']['Row'];
type ArticleInsert = Database['public']['Tables']['articles']['Insert'];
type ArticleUpdate = Database['public']['Tables']['articles']['Update'];
type ArticleDetails = Database['public']['Views']['article_details']['Row'];

export interface ArticleFilters {
  category?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface ArticleMetrics {
  views: number;
  favorites: number;
  shares: number;
  avgReadTime: number;
}

export interface SearchResult {
  articles: ArticleDetails[];
  totalCount: number;
  hasMore: boolean;
}

export class SupabaseArticleService {
  private static instance: SupabaseArticleService;

  private constructor() {}

  public static getInstance(): SupabaseArticleService {
    if (!SupabaseArticleService.instance) {
      SupabaseArticleService.instance = new SupabaseArticleService();
    }
    return SupabaseArticleService.instance;
  }

  /**
   * Store articles in Supabase
   */
  public async storeArticles(articles: ProcessedArticle[]): Promise<{ success: boolean; error?: string; storedCount: number }> {
    try {
      const articleInserts: ArticleInsert[] = articles.map((article, index) => {
        // Validate required fields
        const missingFields = [];
        if (!article.title) missingFields.push('title');
        if (!article.sourceUrl) missingFields.push('sourceUrl');
        if (!article.publishedAt) missingFields.push('publishedAt');
        if (!article.source) missingFields.push('source');
        
        if (missingFields.length > 0) {
          console.error(`❌ Article ${index + 1} missing required fields: ${missingFields.join(', ')}`);
          console.error(`   Article data:`, {
            title: article.title,
            sourceUrl: article.sourceUrl,
            publishedAt: article.publishedAt,
            source: article.source
          });
        }

        // Only include the fields we want to insert (let Supabase auto-generate ID)
        return {
          id: uuidv4(), // Generate a UUID for the insert
          title: article.title,
          source_url: article.sourceUrl,
          published_at: article.publishedAt,
          source: article.source,
          content: article.rawContent || null,
          summary: article.summary || null,
          what: article.what || null,
          impact: article.impact || null,
          takeaways: article.takeaways || null,
          why_this_matters: article.whyThisMatters || null,
          image_url: article.imageUrl || null,
          category: article.category || 'general',
          author: article.author || null,
          ai_summary_generated: !!(article.summary && article.what && article.impact && article.takeaways && article.whyThisMatters)
        };
      });

      // Filter out articles with missing required fields
      const validArticles = articleInserts.filter(article => 
        article.title && article.source_url && article.published_at && article.source
      );

      if (validArticles.length === 0) {
        console.error('❌ No valid articles to store - all articles missing required fields');
        return { success: false, error: 'No valid articles to store', storedCount: 0 };
      }

      if (validArticles.length < articles.length) {
        console.warn(`⚠️ Filtered out ${articles.length - validArticles.length} articles with missing required fields`);
      }

      const { data, error } = await supabase
        .from(TABLES.ARTICLES)
        .insert(validArticles);

      if (error) {
        console.error('❌ Error storing articles:', error);
        console.error('   Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return { success: false, error: error.message, storedCount: 0 };
      }

      console.log(`✅ Successfully stored ${validArticles.length} articles`);
      return { success: true, storedCount: validArticles.length };
    } catch (error) {
      console.error('❌ Unexpected error storing articles:', error);
      return { success: false, error: 'An unexpected error occurred', storedCount: 0 };
    }
  }

  /**
   * Get articles with filters
   */
  public async getArticles(filters: ArticleFilters = {}): Promise<{ success: boolean; data?: SearchResult; error?: string }> {
    try {
      const {
        category,
        source,
        dateFrom,
        dateTo,
        searchQuery,
        limit = 20,
        offset = 0,
      } = filters;

      let query = supabase
        .from(TABLES.ARTICLES)
        .select(`
          *,
          article_metrics!left(views, favorites, shares, avg_read_time)
        `, { count: 'exact' })
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }

      if (source) {
        query = query.eq('source', source);
      }

      if (dateFrom) {
        query = query.gte('published_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('published_at', dateTo);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,summary.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching articles:', error);
        return { success: false, error: error.message };
      }

      const articles = data || [];
      const hasMore = (offset + limit) < (count || 0);

      return {
        success: true,
        data: {
          articles: articles as ArticleDetails[],
          totalCount: count || 0,
          hasMore,
        },
      };
    } catch (error) {
      console.error('Error fetching articles:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get article by ID with metrics
   */
  public async getArticleById(articleId: string): Promise<{ success: boolean; data?: ArticleDetails; error?: string }> {
    try {
      const { data, error } = await supabase
        .from(TABLES.ARTICLES)
        .select(`
          *,
          article_metrics!left(views, favorites, shares, avg_read_time)
        `)
        .eq('id', articleId)
        .single();

      if (error) {
        console.error('Error fetching article:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as ArticleDetails };
    } catch (error) {
      console.error('Error fetching article:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Search articles
   */
  public async searchArticles(query: string, filters: Omit<ArticleFilters, 'searchQuery'> = {}): Promise<{ success: boolean; data?: SearchResult; error?: string }> {
    return this.getArticles({ ...filters, searchQuery: query });
  }

  /**
   * Get trending articles
   */
  public async getTrendingArticles(limit: number = 10): Promise<{ success: boolean; data?: ArticleDetails[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from(TABLES.ARTICLES)
        .select(`
          *,
          article_metrics!left(views, favorites, shares, avg_read_time)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching trending articles:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as ArticleDetails[] };
    } catch (error) {
      console.error('Error fetching trending articles:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get recommended articles for user
   */
  public async getRecommendedArticles(userId: string, limit: number = 10): Promise<{ success: boolean; data?: ArticleDetails[]; error?: string }> {
    try {
      // Get user's favorite categories from preferences
      const { data: preferences } = await supabase
        .from(TABLES.USER_PREFERENCES)
        .select('preferred_categories')
        .eq('user_id', userId)
        .single();

      const preferredCategories = preferences?.preferred_categories || ['cybersecurity', 'hacking', 'general'];

      // Get articles from preferred categories
      const { data, error } = await supabase
        .from(TABLES.ARTICLES)
        .select(`
          *,
          article_metrics!left(views, favorites, shares, avg_read_time)
        `)
        .in('category', preferredCategories)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recommended articles:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as ArticleDetails[] };
    } catch (error) {
      console.error('Error fetching recommended articles:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Update article metrics
   */
  public async updateArticleMetrics(articleId: string, metrics: Partial<ArticleMetrics>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from(TABLES.ARTICLE_METRICS)
        .upsert({
          article_id: articleId,
          ...metrics,
          last_updated: new Date().toISOString(),
        }, { onConflict: 'article_id' });

      if (error) {
        console.error('Error updating article metrics:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating article metrics:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Increment article view count
   */
  public async incrementViewCount(articleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current metrics
      const { data: currentMetrics } = await supabase
        .from(TABLES.ARTICLE_METRICS)
        .select('views')
        .eq('article_id', articleId)
        .single();

      const currentViews = currentMetrics?.views || 0;

      // Update with incremented view count
      return this.updateArticleMetrics(articleId, {
        views: currentViews + 1,
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get categories
   */
  public async getCategories(): Promise<{ success: boolean; data?: Database['public']['Tables']['categories']['Row'][]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Check if article exists
   */
  public async articleExists(articleId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(TABLES.ARTICLES)
        .select('id')
        .eq('id', articleId)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Error checking article existence:', error);
      return false;
    }
  }

  /**
   * Delete old articles (cleanup)
   */
  public async deleteOldArticles(daysOld: number = 30): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from(TABLES.ARTICLES)
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.error('Error deleting old articles:', error);
        return { success: false, deletedCount: 0, error: error.message };
      }

      const deletedCount = data?.length || 0;
      console.log(`Deleted ${deletedCount} old articles`);
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error deleting old articles:', error);
      return { success: false, deletedCount: 0, error: 'An unexpected error occurred' };
    }
  }
}

// Export singleton instance
export const supabaseArticleService = SupabaseArticleService.getInstance();
