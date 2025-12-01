import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { ProcessedArticle } from '../services/newsService';
import { directSupabaseService, DirectArticle } from '../services/directSupabaseService';
import { AISummarizationService } from '../services/aiSummarizationService';
import { ArticleStorageService } from '../services/articleStorageService';
import { SupabaseArticleService } from '../services/supabaseArticleService';
import { getRecentArticles as getRecentArticlesFromUtils, getArticlesToArchive } from '../utils/dateUtils';
import { testflightDiagnostics } from '../services/testflightDiagnostics';

// Helper function to validate if an article has all required fields
const isArticleComplete = (directArticle: DirectArticle): boolean => {
  return !!(
    directArticle.id &&
    directArticle.title &&
    directArticle.summary &&
    directArticle.source &&
    directArticle.published_at &&
    directArticle.image_url &&
    directArticle.what &&
    directArticle.impact &&
    directArticle.takeaways &&
    directArticle.why_this_matters &&
    directArticle.category
  );
};

// Helper function to convert DirectArticle to ProcessedArticle
const convertToProcessedArticle = (directArticle: DirectArticle): ProcessedArticle => ({
  id: directArticle.id,
  title: directArticle.title,
  summary: directArticle.summary,
  sourceUrl: directArticle.redirect_url || '',
  source: directArticle.source,
  author: directArticle.author,
  authorDisplay: directArticle.author || directArticle.source,
  publishedAt: directArticle.published_at,
  imageUrl: directArticle.image_url || undefined,
  category: (directArticle.category as 'cybersecurity' | 'hacking' | 'general') || 'general',
  what: directArticle.what || '',
  impact: directArticle.impact || '',
  takeaways: directArticle.takeaways || '',
  whyThisMatters: directArticle.why_this_matters || ''
});

// Helper function to deduplicate articles by unique ID
const deduplicateArticles = (articles: ProcessedArticle[]): ProcessedArticle[] => {
  const seen = new Set<string>();
  return articles.filter(article => {
    if (seen.has(article.id)) {
      console.log(`🔄 NewsContext: Removing duplicate article: ${article.id}`);
      return false;
    }
    seen.add(article.id);
    return true;
  });
};

interface NewsState {
  articles: ProcessedArticle[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshing: boolean;
  summarizing: boolean;
  favorites: string[];
  loadingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  aiQuotaExceeded: boolean;
  totalStoredArticles: number;
  storageSize: string;
  isInitialized: boolean;
  totalArticles: number;
  currentOffset: number;
  categoryCounts: {
    cybersecurity: number;
    hacking: number;
    general: number;
    archived: number;
    total: number;
  };
  currentCategory: string;
}

type NewsAction =
  | { type: 'SET_ARTICLES'; payload: ProcessedArticle[] }
  | { type: 'ADD_ARTICLES'; payload: ProcessedArticle[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_MORE'; payload: boolean }
  | { type: 'SET_HAS_MORE'; payload: boolean }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LAST_UPDATED'; payload: Date }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_SUMMARIZING'; payload: boolean }
  | { type: 'SET_AI_QUOTA_EXCEEDED'; payload: boolean }
  | { type: 'UPDATE_ARTICLE_SUMMARY'; payload: { id: string; summary: any } }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'SET_FAVORITES'; payload: string[] }
  | { type: 'SET_STORAGE_STATS'; payload: { totalArticles: number; storageSize: string } }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_TOTAL_ARTICLES'; payload: number }
  | { type: 'SET_CURRENT_OFFSET'; payload: number }
  | { type: 'SET_CATEGORY_COUNTS'; payload: { cybersecurity: number; hacking: number; general: number; archived: number; total: number; } }
  | { type: 'SET_CURRENT_CATEGORY'; payload: string };

const initialState: NewsState = {
  articles: [],
  loading: false,
  error: null,
  lastUpdated: null,
  refreshing: false,
  summarizing: false,
  favorites: [],
  loadingMore: false,
  hasMore: true,
  currentPage: 1,
  aiQuotaExceeded: false,
  totalStoredArticles: 0,
  storageSize: '0 KB',
  isInitialized: false,
  totalArticles: 0,
  currentOffset: 0,
  categoryCounts: {
    cybersecurity: 0,
    hacking: 0,
    general: 0,
    archived: 0,
    total: 0
  },
  currentCategory: 'all',
};

function newsReducer(state: NewsState, action: NewsAction): NewsState {
  switch (action.type) {
    case 'SET_ARTICLES':
      return { ...state, articles: action.payload, error: null };
    case 'ADD_ARTICLES':
      return { ...state, articles: [...state.articles, ...action.payload], error: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_LOADING_MORE':
      return { ...state, loadingMore: action.payload };
    case 'SET_HAS_MORE':
      return { ...state, hasMore: action.payload };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.payload };
    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };
    case 'SET_SUMMARIZING':
      return { ...state, summarizing: action.payload };
    case 'SET_AI_QUOTA_EXCEEDED':
      return { ...state, aiQuotaExceeded: action.payload };
    case 'UPDATE_ARTICLE_SUMMARY':
      return {
        ...state,
        articles: state.articles.map(article =>
          article.id === action.payload.id
            ? { ...article, ...action.payload.summary }
            : article
        )
      };
    case 'TOGGLE_FAVORITE':
      const favorites = state.favorites.includes(action.payload)
        ? state.favorites.filter(id => id !== action.payload)
        : [...state.favorites, action.payload];
      return { ...state, favorites };
    case 'SET_FAVORITES':
      return { ...state, favorites: action.payload };
    case 'SET_STORAGE_STATS':
      return { 
        ...state, 
        totalStoredArticles: action.payload.totalArticles,
        storageSize: action.payload.storageSize
      };
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    case 'SET_TOTAL_ARTICLES':
      return { ...state, totalArticles: action.payload };
    case 'SET_CURRENT_OFFSET':
      return { ...state, currentOffset: action.payload };
    case 'SET_CATEGORY_COUNTS':
      return { ...state, categoryCounts: action.payload };
    case 'SET_CURRENT_CATEGORY':
      return { ...state, currentCategory: action.payload };
    default:
      return state;
  }
}

interface NewsContextType {
  state: NewsState;
  fetchNews: (category?: string) => Promise<void>;
  refreshNews: () => Promise<void>;
  clearCacheAndRefresh: () => Promise<void>;
  loadMoreNews: () => Promise<void>;
  getNewsByCategory: (category: 'cybersecurity' | 'hacking' | 'general') => ProcessedArticle[];
  getRecentArticles: () => Promise<ProcessedArticle[]>;
  getArchivedArticles: () => Promise<ProcessedArticle[]>;
  clearError: () => void;
  clearStorage: () => Promise<void>;
  cleanupDuplicates: () => Promise<number>;
  toggleFavorite: (articleId: string) => void;
  favorites: string[];
  getCategoryCounts: () => Promise<void>;
  switchToCategory: (category: string) => Promise<void>;
}

const NewsContext = createContext<NewsContextType | null>(null);

// Helper function to save articles to both local storage and Supabase
const saveArticlesToBoth = async (articles: ProcessedArticle[]): Promise<void> => {
  try {
    // Save to local storage
    await ArticleStorageService.saveArticles(articles);
    console.log(`NewsContext: Saved ${articles.length} articles to local storage`);
    
    // Save to Supabase
    const supabaseService = SupabaseArticleService.getInstance();
    const result = await supabaseService.storeArticles(articles);
    
    if (result.success) {
      console.log(`NewsContext: Saved ${result.storedCount} articles to Supabase`);
    } else {
      console.warn(`NewsContext: Failed to save articles to Supabase:`, result.error);
    }
  } catch (error) {
    console.error('NewsContext: Error saving articles:', error);
    throw error;
  }
};

// Helper function to archive old articles after saving new ones
const archiveOldArticles = async (): Promise<void> => {
  try {
    // Get all articles from local storage
    const allArticles = await ArticleStorageService.getArticles();
    
    // Get articles to archive (older than 14 days)
    const articlesToArchive = getArticlesToArchive(allArticles, 14);
    
    if (articlesToArchive.length > 0) {
      console.log(`NewsContext: Archiving ${articlesToArchive.length} old articles`);
      
      // Archive in Supabase (you can implement this method in SupabaseArticleService)
      const supabaseService = SupabaseArticleService.getInstance();
      // TODO: Implement archiveArticles method in SupabaseArticleService
      
      // Remove archived articles from local storage
      const recentArticles = getRecentArticlesFromUtils(allArticles, 14);
      await ArticleStorageService.clearAllArticles();
      await ArticleStorageService.saveArticles(recentArticles);
      
      console.log(`NewsContext: Archived ${articlesToArchive.length} articles, kept ${recentArticles.length} recent articles`);
    }
  } catch (error) {
    console.error('NewsContext: Error archiving old articles:', error);
  }
};

export function NewsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(newsReducer, initialState);

  const fetchNews = useCallback(async (category: string = 'all') => {
    console.log(`NewsContext: Starting fetchNews for category: ${category}`);
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_CURRENT_CATEGORY', payload: category });

    try {
      // Fetch first page of articles with pagination
      console.log('NewsContext: Loading first page of articles from Supabase...');
      
      const result = await Promise.race([
        directSupabaseService.getArticlesPaginated(50, 0, category),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase query timeout after 10 seconds')), 10000)
        )
      ]) as any;
      
      // Log TestFlight diagnostics
      testflightDiagnostics.logSupabaseQuery('fetchNews', result);
      testflightDiagnostics.logPaginationIssues(0, 50, result.totalCount || 0, result.data?.length || 0);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch articles from Supabase');
      }

      // Filter out incomplete articles and convert DirectArticle to ProcessedArticle
      const completeArticles = result.data.filter(isArticleComplete);
      console.log(`NewsContext: Found ${completeArticles.length} complete articles out of ${result.data.length} total articles`);
      
      if (completeArticles.length === 0) {
        console.warn('NewsContext: No complete articles found - all articles missing required fields');
        throw new Error('No complete articles available. All articles are missing required fields like thumbnails or summaries.');
      }
      
      const processedArticles = completeArticles.map(convertToProcessedArticle);
      console.log(`NewsContext: Successfully processed ${processedArticles.length} complete articles from Supabase`);
      
      // Log article data for TestFlight
      testflightDiagnostics.logArticleData(processedArticles, 'fetchNews');
      testflightDiagnostics.logCategoryMapping(processedArticles);
      testflightDiagnostics.logRedirectUrlIssues(processedArticles);
      
      if (processedArticles.length > 0) {
        console.log('NewsContext: Sample article from Supabase:', {
          id: processedArticles[0].id,
          title: processedArticles[0].title,
          publishedAt: processedArticles[0].publishedAt,
          category: processedArticles[0].category,
          sourceUrl: processedArticles[0].sourceUrl
        });
      }

      // Deduplicate articles to prevent duplicates
      const deduplicatedArticles = deduplicateArticles(processedArticles);
      console.log(`NewsContext: After deduplication: ${deduplicatedArticles.length} articles (${processedArticles.length - deduplicatedArticles.length} duplicates removed)`);

      // Update state with articles and pagination info
      dispatch({ type: 'SET_ARTICLES', payload: deduplicatedArticles });
      dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
      dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 });
      dispatch({ type: 'SET_CURRENT_OFFSET', payload: 0 });
      dispatch({ type: 'SET_TOTAL_ARTICLES', payload: result.totalCount || 0 });
      dispatch({ type: 'SET_HAS_MORE', payload: result.hasMore || false });
      
      // Save to local storage for offline access
      console.log('NewsContext: Saving articles to local storage...');
      await ArticleStorageService.saveArticles(processedArticles);
      
      // Update storage stats
      const stats = await ArticleStorageService.getStorageStats();
      dispatch({ type: 'SET_STORAGE_STATS', payload: stats });
      
      console.log(`NewsContext: Successfully loaded ${processedArticles.length} of ${result.totalCount || 0} articles for category: ${category}`);

    } catch (error) {
      console.error('NewsContext: Error in fetchNews:', error);
      console.log('NewsContext: Supabase failed, trying real news services...');
      
      // Fallback 1: Try real news services
      try {
        const { NewsService } = await import('../services/api');
        const realArticles = await NewsService.fetchNewsFromAPI(1);
        
        if (realArticles && realArticles.length > 0) {
          console.log(`NewsContext: Successfully fetched ${realArticles.length} articles from real news services`);
          
          // Convert ProcessedArticle to ProcessedArticle format (they should be the same)
          const processedArticles = realArticles.map((article, index) => ({
            id: article.id || `real-${index}`,
            title: article.title,
            summary: article.summary || 'No summary available',
            sourceUrl: article.sourceUrl,
            source: article.source,
            author: article.author,
            authorDisplay: article.authorDisplay || article.author || 'Unknown',
            publishedAt: article.publishedAt,
            imageUrl: article.imageUrl,
            category: article.category,
            what: article.what || article.summary || 'No content available',
            impact: article.impact || 'No impact information available',
            takeaways: article.takeaways || 'No takeaways available',
            whyThisMatters: article.whyThisMatters || 'This information is important for your cybersecurity awareness'
          }));
          
          dispatch({ type: 'SET_ARTICLES', payload: processedArticles });
          dispatch({ type: 'SET_ERROR', payload: null }); // Clear error since we have real data
          console.log('NewsContext: Successfully loaded articles from real news services');
        } else {
          throw new Error('No articles from real news services');
        }
      } catch (realNewsError) {
        console.error('NewsContext: Real news services also failed:', realNewsError);
        console.log('NewsContext: Attempting fallback to local storage...');
        
        // Fallback 2: try to load from local storage
        try {
          const localArticles = await ArticleStorageService.getArticles();
          if (localArticles.length > 0) {
            console.log(`NewsContext: Loaded ${localArticles.length} articles from local storage as fallback`);
            dispatch({ type: 'SET_ARTICLES', payload: localArticles });
            dispatch({ type: 'SET_ERROR', payload: null }); // Clear error since we have fallback data
          } else {
            dispatch({ type: 'SET_ERROR', payload: 'No articles available from any source' });
          }
        } catch (fallbackError) {
          console.error('NewsContext: Fallback to local storage also failed:', fallbackError);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch news from all sources' });
        }
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_INITIALIZED', payload: true });
      console.log('NewsContext: fetchNews completed');
    }
  }, []);

  const clearCacheAndRefresh = useCallback(async () => {
    console.log('NewsContext: Clearing cache and refreshing...');
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      // Clear all cached articles
      await ArticleStorageService.clearAllArticles();
      console.log('NewsContext: Cache cleared');
      
      // Fetch fresh articles from multiple categories to ensure we get 64+ articles
      const categories = ['cybersecurity', 'hacking', 'general'];
      let allNewArticles: ProcessedArticle[] = [];
      
      for (const category of categories) {
        try {
          const result = await directSupabaseService.getArticlesByCategory(category, 20);
          if (result.success && result.data) {
            // Filter out incomplete articles
            const completeArticles = result.data.filter(isArticleComplete);
            console.log(`NewsContext: Found ${completeArticles.length} complete articles out of ${result.data.length} total for ${category}`);
            
            if (completeArticles.length > 0) {
              const categoryArticles = completeArticles.map(convertToProcessedArticle);
              allNewArticles = [...allNewArticles, ...categoryArticles];
              console.log(`NewsContext: Fetched ${categoryArticles.length} complete articles for ${category}`);
            }
          }
        } catch (error) {
          console.warn(`NewsContext: Failed to fetch articles for ${category}:`, error);
        }
      }
      
      console.log(`NewsContext: Total fresh articles fetched: ${allNewArticles.length}`);
      
      if (allNewArticles.length > 0) {
        // Save all new articles to storage
        await saveArticlesToBoth(allNewArticles);
        
        // Update state with fresh articles
        dispatch({ type: 'SET_ARTICLES', payload: allNewArticles });
        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
        dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 });
        dispatch({ type: 'SET_HAS_MORE', payload: true });
        
        // Update storage stats
        const stats = await ArticleStorageService.getStorageStats();
        dispatch({ type: 'SET_STORAGE_STATS', payload: stats });
      }
      
      // Summarize with AI
      dispatch({ type: 'SET_SUMMARIZING', payload: true });
      const summarizedArticles = await AISummarizationService.summarizeArticles(allNewArticles);
      
      // Save summarized articles to storage
      await saveArticlesToBoth(summarizedArticles);
      
      // Get updated articles from storage
      const updatedArticles = await ArticleStorageService.getArticles();
      dispatch({ type: 'SET_ARTICLES', payload: updatedArticles });
    } catch (error) {
      console.error('NewsContext: Error clearing cache and refreshing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh news';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_SUMMARIZING', payload: false });
      console.log('NewsContext: Cache clear and refresh completed');
    }
  }, []);

  const refreshNews = useCallback(async () => {
    dispatch({ type: 'SET_REFRESHING', payload: true });
    
    try {
      // Force refresh by clearing any potential caching and adding timestamp
      const refreshTimestamp = Date.now();
      console.log(`NewsContext: Force refreshing articles from Supabase with timestamp: ${refreshTimestamp}`);
      
      // Query Supabase directly for fresh articles with current category
      const result = await directSupabaseService.getArticlesPaginated(50, 0, state.currentCategory);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to refresh articles from Supabase');
      }

      // Filter out incomplete articles and convert DirectArticle to ProcessedArticle
      const completeArticles = result.data.filter(isArticleComplete);
      console.log(`NewsContext: Found ${completeArticles.length} complete articles out of ${result.data.length} total for refresh`);
      
      if (completeArticles.length === 0) {
        console.warn('NewsContext: No complete articles found in refresh - all articles missing required fields');
        dispatch({ type: 'SET_REFRESHING', payload: false });
        return;
      }
      
      const processedArticles = completeArticles.map(convertToProcessedArticle);
      console.log(`NewsContext: Refreshed ${processedArticles.length} complete articles from Supabase for category: ${state.currentCategory}`);
      
      // Log detailed article data for debugging
      if (processedArticles.length > 0) {
        console.log('NewsContext: Sample refreshed article:', {
          id: processedArticles[0].id,
          title: processedArticles[0].title,
          publishedAt: processedArticles[0].publishedAt,
          category: processedArticles[0].category,
          ageInDays: Math.floor((new Date().getTime() - new Date(processedArticles[0].publishedAt).getTime()) / (1000 * 60 * 60 * 24))
        });
      }
      
      // Update state with fresh articles from Supabase
      dispatch({ type: 'SET_ARTICLES', payload: processedArticles });
      dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
      dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 });
      dispatch({ type: 'SET_HAS_MORE', payload: processedArticles.length >= 50 });
      
      // Save to local storage for offline access
      await ArticleStorageService.saveArticles(processedArticles);
      
      // Update storage stats
      const stats = await ArticleStorageService.getStorageStats();
      dispatch({ type: 'SET_STORAGE_STATS', payload: stats });

    } catch (error) {
      console.error('NewsContext: Error refreshing news:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh news from Supabase';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_REFRESHING', payload: false });
    }
  }, []);

  const loadMoreNews = useCallback(async () => {
    if (state.loadingMore || !state.hasMore) return;
    
    dispatch({ type: 'SET_LOADING_MORE', payload: true });
    
    try {
      const nextOffset = state.currentOffset + 50; // Load next 50 articles
      
      console.log(`NewsContext: Loading more articles for category ${state.currentCategory} (offset: ${nextOffset})...`);
      
      // Query Supabase for more articles with proper pagination
      const result = await directSupabaseService.getArticlesPaginated(50, nextOffset, state.currentCategory);
      
      // Log TestFlight diagnostics
      testflightDiagnostics.logSupabaseQuery('loadMoreNews', result);
      testflightDiagnostics.logPaginationIssues(nextOffset, 50, result.totalCount || 0, result.data?.length || 0);
      
      if (result.success && result.data) {
        // Filter out incomplete articles
        const completeArticles = result.data.filter(isArticleComplete);
        console.log(`NewsContext: Found ${completeArticles.length} complete articles out of ${result.data.length} total articles for loadMore`);
        
        if (completeArticles.length === 0) {
          console.warn('NewsContext: No complete articles found in loadMore - all articles missing required fields');
          dispatch({ type: 'SET_LOADING_MORE', payload: false });
          return;
        }
        
        const moreArticles = completeArticles.map(convertToProcessedArticle);
        
        // Log article data for TestFlight
        testflightDiagnostics.logArticleData(moreArticles, 'loadMoreNews');
        testflightDiagnostics.logCategoryMapping(moreArticles);
        testflightDiagnostics.logRedirectUrlIssues(moreArticles);
        
        if (moreArticles.length > 0) {
          // Add new articles to existing articles
          const allArticles = [...state.articles, ...moreArticles];
          
          // Deduplicate articles to prevent duplicates
          const deduplicatedArticles = deduplicateArticles(allArticles);
          
          // Update state with deduplicated articles
          dispatch({ type: 'SET_ARTICLES', payload: deduplicatedArticles });
          dispatch({ type: 'SET_CURRENT_OFFSET', payload: nextOffset });
          dispatch({ type: 'SET_HAS_MORE', payload: result.hasMore || false });
          
          console.log(`NewsContext: Loaded ${moreArticles.length} more articles. Total: ${deduplicatedArticles.length} of ${result.totalCount || 0} (${allArticles.length - deduplicatedArticles.length} duplicates removed)`);
          
          // Save to local storage for offline access
          await ArticleStorageService.saveArticles(deduplicatedArticles);
          
          // Update storage stats
          const stats = await ArticleStorageService.getStorageStats();
          dispatch({ type: 'SET_STORAGE_STATS', payload: stats });
        } else {
          // No more articles available
          console.log('NewsContext: No more articles available');
          dispatch({ type: 'SET_HAS_MORE', payload: false });
        }
      } else {
        console.error('NewsContext: Failed to load more articles:', result.error);
        dispatch({ type: 'SET_HAS_MORE', payload: false });
        dispatch({ type: 'SET_ERROR', payload: result.error || 'Failed to load more articles' });
      }
    } catch (error) {
      console.error('NewsContext: Error loading more news:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load more news';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING_MORE', payload: false });
    }
  }, [state.loadingMore, state.hasMore, state.currentOffset, state.articles, state.currentCategory]);

  const getNewsByCategory = useCallback((category: 'cybersecurity' | 'hacking' | 'general'): ProcessedArticle[] => {
    if (category === 'general') {
      return state.articles;
    }
    return state.articles.filter(article => article.category === category);
  }, [state.articles]);

  const getRecentArticles = useCallback(async (): Promise<ProcessedArticle[]> => {
    try {
      return await ArticleStorageService.getRecentArticles(14);
    } catch (error) {
      console.error('Failed to get recent articles:', error);
      return [];
    }
  }, []);

  const getArchivedArticles = useCallback(async (): Promise<ProcessedArticle[]> => {
    try {
      return await ArticleStorageService.getArchivedArticles(14); // Articles older than 2 weeks
    } catch (error) {
      console.error('Failed to get archived articles:', error);
      return [];
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const clearStorage = useCallback(async () => {
    try {
      await ArticleStorageService.clearAllArticles();
      dispatch({ type: 'SET_ARTICLES', payload: [] });
      dispatch({ type: 'SET_STORAGE_STATS', payload: { totalArticles: 0, storageSize: '0 KB' } });
      console.log('NewsContext: Storage cleared');
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }, []);

  const cleanupDuplicates = useCallback(async () => {
    try {
      const duplicatesRemoved = await ArticleStorageService.removeDuplicates();
      if (duplicatesRemoved > 0) {
        // Reload articles after cleanup
        const articles = await ArticleStorageService.getArticles();
        dispatch({ type: 'SET_ARTICLES', payload: articles });
        
        // Update storage stats
        const stats = await ArticleStorageService.getStorageStats();
        dispatch({ type: 'SET_STORAGE_STATS', payload: stats });
        
        console.log(`NewsContext: Cleaned up ${duplicatesRemoved} duplicate articles`);
        return duplicatesRemoved;
      }
      return 0;
    } catch (error) {
      console.error('NewsContext: Failed to cleanup duplicates:', error);
      return 0;
    }
  }, []);

  const toggleFavorite = useCallback((articleId: string) => {
    dispatch({ type: 'TOGGLE_FAVORITE', payload: articleId });
  }, []);

  // Initialize storage and load articles from Supabase
  const initializeStorage = useCallback(async () => {
    try {
      console.log('NewsContext: Initializing and fetching fresh articles from Supabase...');
      
      // Always fetch fresh articles from Supabase first
      await fetchNews();
      
      // Clean up any existing duplicates in background
      try {
        const duplicatesRemoved = await ArticleStorageService.removeDuplicates();
        if (duplicatesRemoved > 0) {
          console.log(`NewsContext: Cleaned up ${duplicatesRemoved} duplicate articles`);
        }
      } catch (cleanupError) {
        console.warn('NewsContext: Cleanup failed (non-critical):', cleanupError);
      }
      
      console.log('NewsContext: Initialization complete');
    } catch (error) {
      console.error('NewsContext: Failed to initialize:', error);
      // Try to load from local storage as fallback
      try {
        console.log('NewsContext: Attempting fallback to local storage...');
        const existingArticles = await ArticleStorageService.getArticles();
        if (existingArticles.length > 0) {
          dispatch({ type: 'SET_ARTICLES', payload: existingArticles });
          dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
          console.log(`NewsContext: Loaded ${existingArticles.length} articles from local storage as fallback`);
        }
      } catch (fallbackError) {
        console.error('NewsContext: Fallback to local storage failed:', fallbackError);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load articles' });
      } finally {
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      }
    }
  }, [fetchNews]);

  // Get category counts from Supabase
  const getCategoryCounts = useCallback(async () => {
    try {
      // Force refresh category counts with timestamp for debugging
      const refreshTimestamp = Date.now();
      console.log(`NewsContext: Force fetching category counts from Supabase with timestamp: ${refreshTimestamp}`);
      
      const result = await directSupabaseService.getCategoryCounts();
      
      if (result.success && result.counts) {
        dispatch({ type: 'SET_CATEGORY_COUNTS', payload: result.counts });
        console.log('NewsContext: Updated category counts:', result.counts);
        
        // Log detailed counts for debugging
        console.log('NewsContext: Detailed category counts:', {
          cybersecurity: result.counts.cybersecurity,
          hacking: result.counts.hacking,
          general: result.counts.general,
          archived: result.counts.archived,
          total: result.counts.total,
          platform: Platform.OS,
          isProduction: !__DEV__,
          timestamp: refreshTimestamp
        });
      } else {
        console.error('NewsContext: Failed to fetch category counts:', result.error);
      }
    } catch (error) {
      console.error('NewsContext: Error fetching category counts:', error);
    }
  }, []);

  // Switch to a different category
  const switchToCategory = useCallback(async (category: string) => {
    console.log(`NewsContext: Switching to category: ${category}`);
    await fetchNews(category);
  }, [fetchNews]);

  // Initialize storage when component mounts
  useEffect(() => {
    initializeStorage();
  }, [initializeStorage]);

  // Auto-fetch news after initialization
  useEffect(() => {
    if (state.isInitialized && state.articles.length === 0) {
      console.log('NewsContext: Auto-fetching news after initialization');
      fetchNews();
    }
  }, [state.isInitialized, state.articles.length, fetchNews]);

  return (
    <NewsContext.Provider value={{
      state,
      fetchNews,
      refreshNews,
      clearCacheAndRefresh,
      loadMoreNews,
      getNewsByCategory,
      getRecentArticles,
      getArchivedArticles,
      clearError,
      clearStorage,
      cleanupDuplicates,
      toggleFavorite,
      favorites: state.favorites,
      getCategoryCounts,
      switchToCategory,
    }}>
      {children}
    </NewsContext.Provider>
  );
}

export function useNews() {
  const context = useContext(NewsContext);
  if (!context) {
    throw new Error('useNews must be used within a NewsProvider');
  }
  return context;
}
