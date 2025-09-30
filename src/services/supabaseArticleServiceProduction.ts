import { supabase, SupabaseQueryWrapper } from './supabaseClientProduction';
import { Database } from './supabaseClient';
import { TABLES, RPC_FUNCTIONS } from '../constants/supabaseConfig';
import { ProcessedArticle } from './newsService';
import { configService } from './configService';

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

export class SupabaseArticleServiceProduction {
  private static instance: SupabaseArticleServiceProduction;

  private constructor() {}

  public static getInstance(): SupabaseArticleServiceProduction {
    if (!SupabaseArticleServiceProduction.instance) {
      SupabaseArticleServiceProduction.instance = new SupabaseArticleServiceProduction();
    }
    return SupabaseArticleServiceProduction.instance;
  }

  /**
   * Store articles in Supabase with batch processing
   */
  public async storeArticles(articles: ProcessedArticle[]): Promise<{ success: boolean; error?: string; storedCount: number }> {
    const batchSize = configService.getBatchSize();
    console.log(`📝 [Supabase] Storing ${articles.length} articles in batches of ${batchSize}`);
    
    let totalStored = 0;
    const errors: string[] = [];
    
    // Process articles in batches
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      console.log(`📦 [Supabase] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articles.length / batchSize)}`);
      
      const result = await this.storeArticleBatch(batch);
      if (result.success) {
        totalStored += result.storedCount;
      } else {
        errors.push(result.error || 'Unknown error');
      }
    }
    
    if (errors.length > 0) {
      console.warn(`⚠️ [Supabase] Some batches failed:`, errors);
    }
    
    console.log(`✅ [Supabase] Stored ${totalStored}/${articles.length} articles`);
    
    return {
      success: totalStored > 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      storedCount: totalStored
    };
  }

  /**
   * Store a batch of articles
   */
  private async storeArticleBatch(articles: ProcessedArticle[]): Promise<{ success: boolean; error?: string; storedCount: number }> {
    const articleInserts: ArticleInsert[] = articles.map(article => ({
      id: article.id,
      title: article.title,
      summary: article.summary,
      content: null, // ProcessedArticle doesn't have content field
      source_url: article.sourceUrl,
      source: article.source || 'Unknown',
      author: article.author,
      published_at: article.publishedAt,
      image_url: article.imageUrl,
      category: article.category || 'general',
      what: article.what,
      impact: article.impact,
      takeaways: article.takeaways,
      why_this_matters: article.whyThisMatters,
      ai_summary_generated: false, // ProcessedArticle doesn't have this field
    }));

    const result = await SupabaseQueryWrapper.executeQuery(
      'store_articles_batch',
      async () => {
        const { data, error } = await supabase
          .from(TABLES.ARTICLES)
          .upsert(articleInserts, { onConflict: 'id' })
          .select('id');
        return { data, error };
      },
      {
        retries: configService.getMaxRetries(),
        timeout: configService.getQueryTimeout(),
        fallbackData: []
      }
    );

    return {
      success: result.success,
      error: result.error,
      storedCount: Array.isArray(result.data) ? result.data.length : 0
    };
  }

  /**
   * Get articles with filters and pagination
   */
  public async getArticles(filters: ArticleFilters = {}): Promise<{ success: boolean; data?: SearchResult; error?: string }> {
    const {
      category,
      source,
      dateFrom,
      dateTo,
      searchQuery,
      limit = 20,
      offset = 0
    } = filters;

    console.log(`🔍 [Supabase] Fetching articles with filters:`, {
      category,
      source,
      dateFrom,
      dateTo,
      searchQuery,
      limit,
      offset
    });

    // Build query
    let query = supabase
      .from(TABLES.ARTICLES)
      .select(`
        *,
        article_metrics!left(views, favorites, shares, avg_read_time)
      `, { count: 'exact' });

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

    // Apply pagination
    query = query
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const result = await SupabaseQueryWrapper.executeQuery(
      'get_articles',
      async () => {
        const { data, error, count } = await query;
        return { data: { data, count }, error };
      },
      {
        retries: configService.getMaxRetries(),
        timeout: configService.getQueryTimeout(),
        fallbackData: { data: [], count: 0 }
      }
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    const data = result.data as { data: ArticleDetails[]; count: number };
    const articles = data.data || [];
    const totalCount = data.count || 0;
    const hasMore = offset + articles.length < totalCount;

    console.log(`✅ [Supabase] Retrieved ${articles.length} articles (${totalCount} total, hasMore: ${hasMore})`);

    return {
      success: true,
      data: {
        articles,
        totalCount,
        hasMore
      }
    };
  }

  /**
   * Get trending articles with pagination
   */
  public async getTrendingArticles(limit: number = 10): Promise<{ success: boolean; data?: ArticleDetails[]; error?: string }> {
    console.log(`📈 [Supabase] Fetching ${limit} trending articles`);

    const result = await SupabaseQueryWrapper.executeQuery(
      'get_trending_articles',
      async () => {
      const { data, error } = await supabase
        .from(TABLES.ARTICLES)
        .select(`
          *,
          article_metrics!left(views, favorites, shares, avg_read_time)
        `)
        .order('published_at', { ascending: false })
        .limit(limit);
        return { data, error };
      },
      {
        retries: configService.getMaxRetries(),
        timeout: configService.getQueryTimeout(),
        fallbackData: []
      }
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    const articles = result.data as ArticleDetails[] || [];
    console.log(`✅ [Supabase] Retrieved ${articles.length} trending articles`);

    return {
      success: true,
      data: articles
    };
  }

  /**
   * Get recommended articles for user with pagination
   */
  public async getRecommendedArticles(userId: string, limit: number = 10): Promise<{ success: boolean; data?: ArticleDetails[]; error?: string }> {
    console.log(`🎯 [Supabase] Fetching ${limit} recommended articles for user ${userId}`);

    // Get user's favorite categories
    const preferencesResult = await SupabaseQueryWrapper.executeQuery(
      'get_user_preferences',
      async () => {
        const { data, error } = await supabase
          .from(TABLES.USER_PREFERENCES)
          .select('preferred_categories')
          .eq('user_id', userId)
          .single();
        return { data, error };
      },
      {
        retries: 2,
        timeout: 5000,
        fallbackData: { preferred_categories: ['cybersecurity', 'hacking', 'general'] }
      }
    );

    const preferredCategories = preferencesResult.data?.preferred_categories || ['cybersecurity', 'hacking', 'general'];

    // Get articles from preferred categories
    const result = await SupabaseQueryWrapper.executeQuery(
      'get_recommended_articles',
      async () => {
        const { data, error } = await supabase
          .from(TABLES.ARTICLES)
          .select(`
            *,
            article_metrics!left(views, favorites, shares, avg_read_time)
          `)
          .in('category', preferredCategories)
          .order('published_at', { ascending: false })
          .limit(limit);
        return { data, error };
      },
      {
        retries: configService.getMaxRetries(),
        timeout: configService.getQueryTimeout(),
        fallbackData: []
      }
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    const articles = result.data as ArticleDetails[] || [];
    console.log(`✅ [Supabase] Retrieved ${articles.length} recommended articles`);

    return {
      success: true,
      data: articles
    };
  }

  /**
   * Update article metrics
   */
  public async updateArticleMetrics(articleId: string, metrics: Partial<ArticleMetrics>): Promise<{ success: boolean; error?: string }> {
    console.log(`📊 [Supabase] Updating metrics for article ${articleId}`);

    const result = await SupabaseQueryWrapper.executeQuery(
      'update_article_metrics',
      async () => {
        const { data, error } = await supabase
          .from(TABLES.ARTICLE_METRICS)
          .upsert({
            article_id: articleId,
            ...metrics,
            last_updated: new Date().toISOString()
          });
        return { data, error };
      },
      {
        retries: 2,
        timeout: 5000
      }
    );

    return {
      success: result.success,
      error: result.error
    };
  }

  /**
   * Delete old articles
   */
  public async deleteOldArticles(daysOld: number = 30): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    console.log(`🗑️ [Supabase] Deleting articles older than ${daysOld} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await SupabaseQueryWrapper.executeQuery(
      'delete_old_articles',
      async () => {
        const { data, error } = await supabase
          .from(TABLES.ARTICLES)
          .delete()
          .lt('created_at', cutoffDate.toISOString())
          .select('id');
        return { data, error };
      },
      {
        retries: 2,
        timeout: 10000,
        fallbackData: []
      }
    );

    const deletedCount = Array.isArray(result.data) ? result.data.length : 0;
    console.log(`✅ [Supabase] Deleted ${deletedCount} old articles`);

    return {
      success: result.success,
      deletedCount,
      error: result.error
    };
  }
}

// Export singleton instance
export const supabaseArticleServiceProduction = SupabaseArticleServiceProduction.getInstance();
