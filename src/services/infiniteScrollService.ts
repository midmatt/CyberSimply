import { ProcessedArticle } from './newsService';
import { aiArticleGenerationService, AIGenerationRequest } from './aiArticleGenerationService';
import { getRecentArticles, sortArticlesByDate } from '../utils/dateUtils';

export interface InfiniteScrollConfig {
  pageSize: number;
  maxPages: number;
  enableAIGeneration: boolean;
  aiGenerationThreshold: number; // When to start generating AI articles
  refreshInterval: number; // Minutes between refreshes
}

export interface ScrollState {
  currentPage: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  articles: ProcessedArticle[];
  totalArticles: number;
  lastRefresh: Date | null;
  aiGeneratedCount: number;
  error: string | null;
}

export class InfiniteScrollService {
  private static instance: InfiniteScrollService;
  private config: InfiniteScrollConfig;
  private state: ScrollState;
  private refreshTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      pageSize: 10,
      maxPages: 50,
      enableAIGeneration: true,
      aiGenerationThreshold: 20, // Start AI generation after 20 articles
      refreshInterval: 30 // 30 minutes
    };

    this.state = {
      currentPage: 0,
      hasMore: true,
      isLoading: false,
      isLoadingMore: false,
      articles: [],
      totalArticles: 0,
      lastRefresh: null,
      aiGeneratedCount: 0,
      error: null
    };
  }

  public static getInstance(): InfiniteScrollService {
    if (!InfiniteScrollService.instance) {
      InfiniteScrollService.instance = new InfiniteScrollService();
    }
    return InfiniteScrollService.instance;
  }

  /**
   * Initialize the infinite scroll service
   */
  public async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      this.startRefreshTimer();
      return { success: true };
    } catch (error) {
      console.error('Infinite scroll initialization error:', error);
      return { success: false, error: 'Failed to initialize infinite scroll' };
    }
  }

  /**
   * Load initial articles
   */
  public async loadInitialArticles(): Promise<{ success: boolean; articles: ProcessedArticle[]; error?: string }> {
    if (this.state.isLoading) {
      return { success: false, articles: [], error: 'Already loading' };
    }

    this.setState({ isLoading: true, error: null });

    try {
      // Load first page of real articles
      const realArticles = await this.loadRealArticles(0);
      
      // Filter real articles to show only recent ones (not archived)
      const recentRealArticles = getRecentArticles(realArticles, 14);
      
      // If we have few real articles and AI generation is enabled, generate some
      let aiArticles: ProcessedArticle[] = [];
      if (this.config.enableAIGeneration && recentRealArticles.length < this.config.aiGenerationThreshold) {
        aiArticles = await this.generateAIArticles(5);
      }

      const allArticles = [...recentRealArticles, ...aiArticles];
      
      this.setState({
        articles: allArticles,
        currentPage: 0,
        hasMore: allArticles.length >= this.config.pageSize,
        isLoading: false,
        lastRefresh: new Date(),
        aiGeneratedCount: aiArticles.length
      });

      return { success: true, articles: allArticles };

    } catch (error) {
      console.error('Error loading initial articles:', error);
      this.setState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to load articles' 
      });
      return { 
        success: false, 
        articles: [], 
        error: error instanceof Error ? error.message : 'Failed to load articles' 
      };
    }
  }

  /**
   * Load more articles (for infinite scroll)
   */
  public async loadMoreArticles(): Promise<{ success: boolean; articles: ProcessedArticle[]; error?: string }> {
    if (this.state.isLoadingMore || !this.state.hasMore) {
      return { success: false, articles: [], error: 'Cannot load more' };
    }

    this.setState({ isLoadingMore: true, error: null });

    try {
      const nextPage = this.state.currentPage + 1;
      let newArticles: ProcessedArticle[] = [];

      // Try to load real articles first
      const realArticles = await this.loadRealArticles(nextPage);
      
      // Filter real articles to show only recent ones (not archived)
      const recentRealArticles = getRecentArticles(realArticles, 14);
      newArticles = [...recentRealArticles];

      // If we don't have enough real articles and AI generation is enabled, generate more
      if (this.config.enableAIGeneration && recentRealArticles.length < this.config.pageSize) {
        const remainingNeeded = this.config.pageSize - recentRealArticles.length;
        const aiArticles = await this.generateAIArticles(remainingNeeded);
        newArticles = [...newArticles, ...aiArticles];
        this.setState({ aiGeneratedCount: this.state.aiGeneratedCount + aiArticles.length });
      }

      const updatedArticles = [...this.state.articles, ...newArticles];
      
      this.setState({
        articles: updatedArticles,
        currentPage: nextPage,
        hasMore: newArticles.length >= this.config.pageSize && nextPage < this.config.maxPages,
        isLoadingMore: false
      });

      return { success: true, articles: newArticles };

    } catch (error) {
      console.error('Error loading more articles:', error);
      this.setState({ 
        isLoadingMore: false, 
        error: error instanceof Error ? error.message : 'Failed to load more articles' 
      });
      return { 
        success: false, 
        articles: [], 
        error: error instanceof Error ? error.message : 'Failed to load more articles' 
      };
    }
  }

  /**
   * Refresh articles (pull to refresh)
   */
  public async refreshArticles(): Promise<{ success: boolean; articles: ProcessedArticle[]; error?: string }> {
    this.setState({ 
      currentPage: 0, 
      hasMore: true, 
      articles: [], 
      aiGeneratedCount: 0,
      error: null 
    });
    
    return this.loadInitialArticles();
  }

  /**
   * Load real articles from external APIs
   */
  private async loadRealArticles(page: number): Promise<ProcessedArticle[]> {
    // This would integrate with your existing news service
    // For now, return empty array as placeholder
    // In a real implementation, you'd call your news API here
    return [];
  }

  /**
   * Generate AI articles
   */
  private async generateAIArticles(count: number): Promise<ProcessedArticle[]> {
    try {
      const request: AIGenerationRequest = {
        count,
        category: 'cybersecurity',
        style: 'news',
        complexity: 'intermediate'
      };

      const response = await aiArticleGenerationService.generateArticles(request);
      
      if (response.success) {
        return response.articles;
      } else {
        console.error('AI article generation failed:', response.error);
        return [];
      }
    } catch (error) {
      console.error('Error generating AI articles:', error);
      return [];
    }
  }

  /**
   * Get trending topics for AI generation
   */
  public async getTrendingTopics(): Promise<{ topics: string[]; success: boolean; error?: string }> {
    try {
      return await aiArticleGenerationService.generateTrendingTopics();
    } catch (error) {
      console.error('Error getting trending topics:', error);
      return {
        topics: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get trending topics'
      };
    }
  }

  /**
   * Generate personalized recommendations
   */
  public async getPersonalizedRecommendations(
    userPreferences: {
      categories: string[];
      readingHistory: string[];
      favoriteTopics: string[];
    }
  ): Promise<{ recommendations: string[]; success: boolean; error?: string }> {
    try {
      return await aiArticleGenerationService.generatePersonalizedRecommendations(userPreferences);
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return {
        recommendations: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recommendations'
      };
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<InfiniteScrollConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current state
   */
  public getState(): ScrollState {
    return { ...this.state };
  }

  /**
   * Get articles for current page
   */
  public getCurrentPageArticles(): ProcessedArticle[] {
    const startIndex = this.state.currentPage * this.config.pageSize;
    const endIndex = startIndex + this.config.pageSize;
    return this.state.articles.slice(startIndex, endIndex);
  }

  /**
   * Check if we should load more articles
   */
  public shouldLoadMore(currentIndex: number): boolean {
    return currentIndex >= this.state.articles.length - 3 && 
           this.state.hasMore && 
           !this.state.isLoadingMore;
  }

  /**
   * Start refresh timer
   */
  private startRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      this.refreshArticles();
    }, this.config.refreshInterval * 60 * 1000);
  }

  /**
   * Stop refresh timer
   */
  public stopRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Update state
   */
  private setState(updates: Partial<ScrollState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Clean up
   */
  public cleanup(): void {
    this.stopRefreshTimer();
  }
}

// Export singleton instance
export const infiniteScrollService = InfiniteScrollService.getInstance();
