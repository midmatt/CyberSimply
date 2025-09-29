import { Platform } from 'react-native';

/**
 * TestFlight Diagnostics Service
 * Provides enhanced logging and debugging for TestFlight builds
 */
export class TestFlightDiagnostics {
  private static instance: TestFlightDiagnostics;
  private isTestFlight: boolean = false;

  private constructor() {
    // Detect if running in TestFlight
    this.isTestFlight = Platform.OS === 'ios' && __DEV__ === false;
  }

  public static getInstance(): TestFlightDiagnostics {
    if (!TestFlightDiagnostics.instance) {
      TestFlightDiagnostics.instance = new TestFlightDiagnostics();
    }
    return TestFlightDiagnostics.instance;
  }

  /**
   * Log with TestFlight-specific formatting
   */
  public log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const prefix = this.isTestFlight ? '[TESTFLIGHT]' : '[DEBUG]';
    
    const logMessage = `${prefix} [${level.toUpperCase()}] ${timestamp}: ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }

  /**
   * Log article data for debugging
   */
  public logArticleData(articles: any[], context: string): void {
    if (!this.isTestFlight) return;

    this.log('info', `Article data for ${context}:`, {
      count: articles.length,
      sample: articles.length > 0 ? {
        id: articles[0].id,
        title: articles[0].title,
        category: articles[0].category,
        sourceUrl: articles[0].sourceUrl,
        redirectUrl: articles[0].redirect_url,
        publishedAt: articles[0].publishedAt
      } : null,
      categories: articles.map(a => a.category).filter((v, i, a) => a.indexOf(v) === i),
      hasDuplicates: this.checkForDuplicates(articles)
    });
  }

  /**
   * Log Supabase query results
   */
  public logSupabaseQuery(queryName: string, result: any): void {
    if (!this.isTestFlight) return;

    this.log('info', `Supabase query ${queryName}:`, {
      success: result.success,
      dataCount: result.data?.length || 0,
      error: result.error,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
      sampleData: result.data?.[0] ? {
        id: result.data[0].id,
        title: result.data[0].title,
        category: result.data[0].category,
        redirect_url: result.data[0].redirect_url
      } : null
    });
  }

  /**
   * Check for duplicate articles
   */
  private checkForDuplicates(articles: any[]): boolean {
    const ids = articles.map(a => a.id);
    const uniqueIds = new Set(ids);
    return ids.length !== uniqueIds.size;
  }

  /**
   * Log category mapping issues
   */
  public logCategoryMapping(articles: any[]): void {
    if (!this.isTestFlight) return;

    const categoryMap = articles.reduce((acc, article) => {
      const category = article.category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    this.log('info', 'Category mapping analysis:', {
      categoryDistribution: categoryMap,
      totalArticles: articles.length,
      unknownCategory: articles.filter(a => !a.category || a.category === 'unknown').length
    });
  }

  /**
   * Log redirect URL issues
   */
  public logRedirectUrlIssues(articles: any[]): void {
    if (!this.isTestFlight) return;

    const redirectUrlStats = {
      total: articles.length,
      withRedirectUrl: articles.filter(a => a.redirect_url || a.sourceUrl).length,
      withoutRedirectUrl: articles.filter(a => !a.redirect_url && !a.sourceUrl).length,
      nullRedirectUrl: articles.filter(a => a.redirect_url === null).length,
      undefinedRedirectUrl: articles.filter(a => a.redirect_url === undefined).length
    };

    this.log('warn', 'Redirect URL analysis:', redirectUrlStats);

    // Log sample articles with missing redirect URLs
    const missingRedirects = articles.filter(a => !a.redirect_url && !a.sourceUrl).slice(0, 3);
    if (missingRedirects.length > 0) {
      this.log('warn', 'Sample articles missing redirect URLs:', missingRedirects.map(a => ({
        id: a.id,
        title: a.title,
        source: a.source
      })));
    }
  }

  /**
   * Log pagination issues
   */
  public logPaginationIssues(offset: number, limit: number, totalCount: number, returnedCount: number): void {
    if (!this.isTestFlight) return;

    this.log('info', 'Pagination analysis:', {
      offset,
      limit,
      totalCount,
      returnedCount,
      expectedRange: `${offset + 1}-${offset + limit}`,
      actualRange: returnedCount > 0 ? `${offset + 1}-${offset + returnedCount}` : 'none',
      hasMore: (offset + limit) < totalCount
    });
  }
}

export const testflightDiagnostics = TestFlightDiagnostics.getInstance();