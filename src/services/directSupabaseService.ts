import { Platform } from 'react-native';
import { supabase } from './supabaseClientProduction';
import { testflightDiagnostics } from './testflightDiagnostics';

export interface DirectArticle {
  id: string;
  title: string;
  source: string;
  author: string | null;
  published_at: string;
  summary: string;
  what: string | null;
  impact: string | null;
  takeaways: string | null;
  why_this_matters: string | null;
  redirect_url: string | null;
  image_url: string | null;
  category: string | null;
  ai_summary_generated: boolean | null;
}

/**
 * Direct Supabase Service - Always queries Supabase directly
 * This ensures the app shows exactly what's in the database
 */
export class DirectSupabaseService {
  private static instance: DirectSupabaseService;

  private constructor() {}

  public static getInstance(): DirectSupabaseService {
    if (!DirectSupabaseService.instance) {
      DirectSupabaseService.instance = new DirectSupabaseService();
    }
    return DirectSupabaseService.instance;
  }

  /**
   * Get articles with pagination (for home screen and category pages)
   */
  public async getArticlesPaginated(limit: number = 50, offset: number = 0, category?: string): Promise<{
    success: boolean;
    data?: DirectArticle[];
    totalCount?: number;
    hasMore?: boolean;
    error?: string;
  }> {
    try {
      console.log(`🔍 DirectSupabaseService: Fetching ${category || 'all'} articles (limit: ${limit}, offset: ${offset})...`);
      
      // Log current time and cutoff for debugging
      const now = new Date();
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);
      twoWeeksAgo.setUTCHours(0, 0, 0, 0);
      
      console.log('🕐 DirectSupabaseService: Time debugging:', {
        currentTime: now.toISOString(),
        currentTimeUTC: now.toUTCString(),
        twoWeeksAgo: twoWeeksAgo.toISOString(),
        twoWeeksAgoUTC: twoWeeksAgo.toUTCString(),
        category,
        platform: Platform.OS,
        isProduction: !__DEV__
      });
      
      // First, validate table exists and has data
      await this.validateTableState();
      
      // Use the exact query structure requested: .select('*').order('published_at', { ascending: false }).limit(50)
      let query = supabase
        .from('articles')
        .select(`
          id,
          title,
          source,
          author,
          published_at,
          summary,
          what,
          impact,
          takeaways,
          why_this_matters,
          redirect_url,
          image_url,
          category,
          ai_summary_generated
        `, { count: 'exact' })
        .order('published_at', { ascending: false });

      // Apply category filter if specified
      if (category && category !== 'all') {
        if (category === 'archived') {
          // Articles older than 2 weeks - use UTC to avoid timezone issues
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);
          twoWeeksAgo.setUTCHours(0, 0, 0, 0); // Start of day in UTC
          query = query.lt('published_at', twoWeeksAgo.toISOString());
        } else {
          // Use the actual category column from the database
          query = query.eq('category', category);
        }
      } else if (category === 'all') {
        // For 'all', exclude archived articles (show only recent) - use UTC to avoid timezone issues
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);
        twoWeeksAgo.setUTCHours(0, 0, 0, 0); // Start of day in UTC
        query = query.gte('published_at', twoWeeksAgo.toISOString());
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ DirectSupabaseService: Error fetching articles:', error);
        console.error('❌ DirectSupabaseService: Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Log TestFlight diagnostics for errors
        testflightDiagnostics.log('error', 'Supabase query failed', {
          error: error.message,
          code: error.code,
          category,
          offset,
          limit
        });
        
        return { success: false, error: error.message };
      }

      const totalCount = count || 0;
      const hasMore = (offset + limit) < totalCount;
      
      console.log(`✅ DirectSupabaseService: Found ${data?.length || 0} ${category || 'all'} articles (${offset + 1}-${offset + (data?.length || 0)} of ${totalCount})`);
      
      // Log TestFlight diagnostics for successful queries
      testflightDiagnostics.log('info', 'Articles fetched successfully', {
        category,
        returnedCount: data?.length || 0,
        totalCount,
        hasMore,
        offset,
        limit
      });
      
      if (data && data.length > 0) {
        console.log('📰 DirectSupabaseService: Sample article:', {
          id: data[0].id,
          title: data[0].title,
          published_at: data[0].published_at,
          category: data[0].category,
          redirect_url: data[0].redirect_url
        });
        
        // Log detailed article data for debugging
        console.log('📊 DirectSupabaseService: Article date analysis:', {
          totalArticles: data.length,
          sampleDates: data.slice(0, 3).map(article => ({
            id: article.id,
            published_at: article.published_at,
            ageInDays: Math.floor((new Date().getTime() - new Date(article.published_at).getTime()) / (1000 * 60 * 60 * 24))
          })),
          cutoffDate: twoWeeksAgo.toISOString(),
          platform: Platform.OS,
          isProduction: !__DEV__
        });
        
        // Log TestFlight diagnostics for article data
        testflightDiagnostics.logArticleData(data, `getArticlesPaginated-${category}`);
        testflightDiagnostics.logCategoryMapping(data);
        testflightDiagnostics.logRedirectUrlIssues(data);
      } else {
        // Log empty results for TestFlight debugging
        testflightDiagnostics.log('warn', 'No articles returned from query', {
          category,
          offset,
          limit,
          totalCount
        });
      }

      return { 
        success: true, 
        data: data || [],
        totalCount,
        hasMore
      };
    } catch (error) {
      console.error('❌ DirectSupabaseService: Unexpected error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get category keywords for filtering
   */
  private getCategoryKeywords(category: string): string[] {
    switch (category) {
      case 'cybersecurity':
        return ['security', 'breach', 'vulnerability', 'malware', 'ransomware', 'phishing', 'cyber attack', 'data leak', 'encryption', 'firewall', 'antivirus', 'threat', 'incident', 'compliance', 'gdpr', 'hipaa', 'pci', 'iso', 'nist', 'framework', 'audit', 'penetration test'];
      case 'hacking':
        return ['hack', 'exploit', 'zero-day', 'backdoor', 'trojan', 'botnet', 'ddos', 'sql injection', 'xss', 'csrf', 'privilege escalation', 'rootkit', 'keylogger', 'social engineering', 'cracking'];
      case 'general':
        return ['technology', 'tech', 'innovation', 'digital', 'software', 'hardware', 'network', 'internet', 'web', 'app', 'mobile', 'cloud', 'data', 'ai', 'artificial intelligence', 'machine learning'];
      default:
        return [];
    }
  }

  /**
   * Get articles directly from Supabase with pagination support (kept for backward compatibility)
   */
  public async getArticles(limit: number = 50, offset: number = 0): Promise<{
    success: boolean;
    data?: DirectArticle[];
    totalCount?: number;
    hasMore?: boolean;
    error?: string;
  }> {
    // Redirect to getArticlesPaginated for backward compatibility
    return this.getArticlesPaginated(limit, offset, 'all');
  }

  /**
   * Get actual article counts per category from Supabase
   */
  public async getCategoryCounts(): Promise<{
    success: boolean;
    counts?: {
      cybersecurity: number;
      hacking: number;
      general: number;
      archived: number;
      total: number;
    };
    error?: string;
  }> {
    try {
      console.log('🔍 DirectSupabaseService: Getting category counts from Supabase...');
      
      // Use UTC to avoid timezone issues
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);
      twoWeeksAgo.setUTCHours(0, 0, 0, 0); // Start of day in UTC
      const twoWeeksAgoISO = twoWeeksAgo.toISOString();
      
      // Get total count
      const { count: totalCount, error: totalError } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true });
      
      if (totalError) {
        console.error('❌ DirectSupabaseService: Error getting total count:', totalError);
        return { success: false, error: totalError.message };
      }

      // Get archived count (articles older than 2 weeks)
      const { count: archivedCount, error: archivedError } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .lt('published_at', twoWeeksAgoISO);
      
      if (archivedError) {
        console.error('❌ DirectSupabaseService: Error getting archived count:', archivedError);
        return { success: false, error: archivedError.message };
      }

      // Get cybersecurity count using actual category column
      const { count: cybersecurityCount, error: cybersecError } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .gte('published_at', twoWeeksAgoISO)
        .eq('category', 'cybersecurity');
      
      if (cybersecError) {
        console.error('❌ DirectSupabaseService: Error getting cybersecurity count:', cybersecError);
        return { success: false, error: cybersecError.message };
      }

      // Get hacking count using actual category column
      const { count: hackingCount, error: hackingError } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .gte('published_at', twoWeeksAgoISO)
        .eq('category', 'hacking');
      
      if (hackingError) {
        console.error('❌ DirectSupabaseService: Error getting hacking count:', hackingError);
        return { success: false, error: hackingError.message };
      }

      // Get general count using actual category column
      const { count: generalCount, error: generalError } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .gte('published_at', twoWeeksAgoISO)
        .eq('category', 'general');
      
      if (generalError) {
        console.error('❌ DirectSupabaseService: Error getting general count:', generalError);
        return { success: false, error: generalError.message };
      }

      const counts = {
        cybersecurity: cybersecurityCount || 0,
        hacking: hackingCount || 0,
        general: generalCount || 0,
        archived: archivedCount || 0,
        total: totalCount || 0
      };

      console.log('📊 DirectSupabaseService: Category counts:', counts);
      
      return { success: true, counts };
    } catch (error) {
      console.error('❌ DirectSupabaseService: Unexpected error getting category counts:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get total count of articles
   */
  public async getTotalArticleCount(): Promise<{
    success: boolean;
    count?: number;
    error?: string;
  }> {
    try {
      console.log('🔍 DirectSupabaseService: Getting total article count...');
      
      const { count, error } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('❌ DirectSupabaseService: Error getting count:', error);
        return { success: false, error: error.message };
      }

      console.log(`📊 DirectSupabaseService: Total articles: ${count || 0}`);
      return { success: true, count: count || 0 };
    } catch (error) {
      console.error('❌ DirectSupabaseService: Unexpected error getting count:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get article by ID
   */
  public async getArticleById(id: string): Promise<{
    success: boolean;
    data?: DirectArticle;
    error?: string;
  }> {
    try {
      console.log(`🔍 DirectSupabaseService: Fetching article ${id}...`);
      
      const { data, error } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          source,
          author,
          published_at,
          summary,
          what,
          impact,
          takeaways,
          why_this_matters,
          redirect_url,
          image_url,
          category,
          ai_summary_generated
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error(`❌ DirectSupabaseService: Error fetching article ${id}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('❌ DirectSupabaseService: Unexpected error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Search articles
   */
  public async searchArticles(query: string, limit: number = 30): Promise<{
    success: boolean;
    data?: DirectArticle[];
    error?: string;
  }> {
    try {
      console.log(`🔍 DirectSupabaseService: Searching articles for "${query}"...`);
      
      const { data, error } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          source,
          author,
          published_at,
          summary,
          what,
          impact,
          takeaways,
          why_this_matters,
          redirect_url,
          image_url,
          category,
          ai_summary_generated
        `)
        .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ DirectSupabaseService: Error searching articles:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ DirectSupabaseService: Found ${data?.length || 0} articles matching "${query}"`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ DirectSupabaseService: Unexpected error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Categorize articles based on their content and source
   */
  public categorizeArticles(articles: DirectArticle[]): {
    cybersecurity: DirectArticle[];
    hacking: DirectArticle[];
    general: DirectArticle[];
    archived: DirectArticle[];
  } {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const categories = {
      cybersecurity: [] as DirectArticle[],
      hacking: [] as DirectArticle[],
      general: [] as DirectArticle[],
      archived: [] as DirectArticle[]
    };

    articles.forEach(article => {
      const publishedDate = new Date(article.published_at);
      const isArchived = publishedDate < twoWeeksAgo;
      
      // Categorize based on title, source, and content keywords
      const title = article.title.toLowerCase();
      const source = article.source?.toLowerCase() || '';
      const summary = article.summary?.toLowerCase() || '';
      const what = article.what?.toLowerCase() || '';
      
      const cybersecurityKeywords = [
        'security', 'breach', 'vulnerability', 'malware', 'ransomware', 
        'phishing', 'cyber attack', 'data leak', 'encryption', 'firewall',
        'antivirus', 'threat', 'incident', 'compliance', 'gdpr', 'hipaa',
        'pci', 'iso', 'nist', 'framework', 'audit', 'penetration test'
      ];
      
      const hackingKeywords = [
        'hack', 'exploit', 'zero-day', 'backdoor', 'trojan', 'botnet',
        'ddos', 'sql injection', 'xss', 'csrf', 'privilege escalation',
        'rootkit', 'keylogger', 'social engineering', 'cracking'
      ];
      
      const allText = `${title} ${source} ${summary} ${what}`;
      
      // Check for hacking keywords first (more specific)
      const hasHackingKeywords = hackingKeywords.some(keyword => 
        allText.includes(keyword)
      );
      
      // Check for cybersecurity keywords
      const hasSecurityKeywords = cybersecurityKeywords.some(keyword => 
        allText.includes(keyword)
      );
      
      // Categorize
      if (isArchived) {
        categories.archived.push(article);
      } else if (hasHackingKeywords) {
        categories.hacking.push(article);
      } else if (hasSecurityKeywords) {
        categories.cybersecurity.push(article);
      } else {
        categories.general.push(article);
      }
    });

    console.log(`📊 DirectSupabaseService: Categorized ${articles.length} articles:`, {
      cybersecurity: categories.cybersecurity.length,
      hacking: categories.hacking.length,
      general: categories.general.length,
      archived: categories.archived.length
    });

    return categories;
  }

  /**
   * Get articles by category
   */
  public async getArticlesByCategory(category: string, limit: number = 30): Promise<{
    success: boolean;
    data?: DirectArticle[];
    error?: string;
  }> {
    try {
      console.log(`🔍 DirectSupabaseService: Fetching ${category} articles...`);
      
      const { data, error } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          source,
          author,
          published_at,
          summary,
          what,
          impact,
          takeaways,
          why_this_matters,
          redirect_url,
          image_url,
          category,
          ai_summary_generated
        `)
        .eq('category', category)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error(`❌ DirectSupabaseService: Error fetching ${category} articles:`, error);
        return { success: false, error: error.message };
      }

      console.log(`✅ DirectSupabaseService: Found ${data?.length || 0} ${category} articles`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ DirectSupabaseService: Unexpected error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Validate table state and log diagnostics for TestFlight
   */
  private async validateTableState(): Promise<void> {
    try {
      console.log('🔍 DirectSupabaseService: Validating table state...');
      
      // Check if articles table exists and has data
      const { data: tableInfo, error: tableError } = await supabase
        .from('articles')
        .select('id, created_at, updated_at')
        .limit(1);
      
      if (tableError) {
        console.error('❌ DirectSupabaseService: Table validation failed:', tableError);
        testflightDiagnostics.log('error', 'Articles table validation failed', {
          error: tableError.message,
          code: tableError.code,
          details: tableError.details
        });
        return;
      }
      
      // Get table statistics
      const { count: totalCount, error: countError } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('❌ DirectSupabaseService: Count query failed:', countError);
        testflightDiagnostics.log('error', 'Articles count query failed', {
          error: countError.message,
          code: countError.code
        });
        return;
      }
      
      // Check for recent articles - use UTC to avoid timezone issues
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);
      twoWeeksAgo.setUTCHours(0, 0, 0, 0); // Start of day in UTC
      
      const { count: recentCount, error: recentError } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .gte('published_at', twoWeeksAgo.toISOString());
      
      if (recentError) {
        console.error('❌ DirectSupabaseService: Recent count query failed:', recentError);
        testflightDiagnostics.log('error', 'Recent articles count query failed', {
          error: recentError.message,
          code: recentError.code
        });
        return;
      }
      
      // Log table state for TestFlight debugging
      testflightDiagnostics.log('info', 'Table validation completed', {
        totalArticles: totalCount || 0,
        recentArticles: recentCount || 0,
        hasData: (totalCount || 0) > 0,
        hasRecentData: (recentCount || 0) > 0,
        sampleArticle: tableInfo?.[0] ? {
          id: tableInfo[0].id,
          created_at: tableInfo[0].created_at,
          updated_at: tableInfo[0].updated_at
        } : null
      });
      
      // Check for potential issues
      if ((totalCount || 0) === 0) {
        testflightDiagnostics.log('warn', 'Articles table is empty', {
          totalCount,
          recentCount
        });
      } else if ((recentCount || 0) === 0) {
        testflightDiagnostics.log('warn', 'No recent articles found', {
          totalCount,
          recentCount,
          cutoffDate: twoWeeksAgo.toISOString()
        });
      }
      
      console.log(`✅ DirectSupabaseService: Table validation complete - ${totalCount || 0} total articles, ${recentCount || 0} recent articles`);
      
    } catch (error) {
      console.error('❌ DirectSupabaseService: Table validation error:', error);
      testflightDiagnostics.log('error', 'Table validation threw error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Export singleton instance
export const directSupabaseService = DirectSupabaseService.getInstance();
