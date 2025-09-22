import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from 'react';
import { NewsService } from '../services/api';
import { ProcessedArticle } from '../services/newsService';
import { AISummarizationService } from '../services/aiSummarizationService';
import { ArticleStorageService } from '../services/articleStorageService';
import { SupabaseArticleService } from '../services/supabaseArticleService';
import { getRecentArticles as getRecentArticlesFromUtils, getArticlesToArchive, sortArticlesByDate } from '../utils/dateUtils';

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
  | { type: 'SET_INITIALIZED'; payload: boolean };

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
    default:
      return state;
  }
}

interface NewsContextType {
  state: NewsState;
  fetchNews: () => Promise<void>;
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
}

const NewsContext = createContext<NewsContextType | null>(null);

// Helper function to save articles to both local storage and Supabase
const saveArticlesToBoth = async (articles: ProcessedArticle[]): Promise<void> => {
  try {
    // Validate articles before saving
    if (!articles || articles.length === 0) {
      console.warn("NewsContext: No articles to save");
      return;
    }

    // Filter out invalid articles
    const validArticles = articles.filter(article => {
      const isValid = !!(article.title && article.sourceUrl && article.publishedAt && article.source);
      if (!isValid) {
        console.warn(`NewsContext: Skipping invalid article: ${article.title || 'Untitled'}`);
      }
      return isValid;
    });

    if (validArticles.length === 0) {
      console.warn("NewsContext: No valid articles to save after filtering");
      return;
    }

    console.log(`NewsContext: Saving ${validArticles.length} valid articles (${articles.length - validArticles.length} invalid articles filtered out)`);

    // Save to local storage
    try {
      await ArticleStorageService.saveArticles(validArticles);
      console.log(`NewsContext: Saved ${validArticles.length} articles to local storage`);
    } catch (storageError) {
      console.error("NewsContext: Failed to save articles to local storage:", storageError);
      // Continue with Supabase save even if local storage fails
    }
    
    // Save to Supabase
    try {
      const supabaseService = SupabaseArticleService.getInstance();
      const result = await supabaseService.storeArticles(validArticles);
      
      if (result.success) {
        console.log(`NewsContext: Saved ${result.storedCount} articles to Supabase`);
      } else {
        console.error(`NewsContext: Failed to save articles to Supabase:`, {
          error: result.error,
          storedCount: result.storedCount,
          totalArticles: validArticles.length
        });
      }
    } catch (supabaseError) {
      console.error("NewsContext: Supabase save failed with exception:", {
        error: supabaseError,
        message: supabaseError instanceof Error ? supabaseError.message : 'Unknown error',
        stack: supabaseError instanceof Error ? supabaseError.stack : undefined
      });
    }
  } catch (error) {
    console.error("NewsContext: Unexpected error in saveArticlesToBoth:", {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      articlesCount: articles?.length || 0
    });
    return;
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

  const fetchNews = useCallback(async () => {
    console.log('NewsContext: Starting fetchNews...');
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Fetch articles from Supabase instead of local storage
      console.log('NewsContext: Fetching articles from Supabase...');
      const supabaseService = SupabaseArticleService.getInstance();
      const result = await supabaseService.getArticles({ limit: 50 });
      
      if (result.success && result.data) {
        console.log(`NewsContext: Fetched ${result.data.articles.length} articles from Supabase`);
        
        // Transform Supabase articles to ProcessedArticle format
        const processedArticles: ProcessedArticle[] = result.data.articles.map(article => ({
          id: article.id,
          title: article.title,
          sourceUrl: article.source_url || '',
          publishedAt: article.published_at || new Date().toISOString(),
          source: article.source || 'Unknown',
          rawContent: article.content || '',
          summary: article.summary,
          impact: article.impact,
          takeaways: article.takeaways,
          author: article.author,
          authorDisplay: article.author || article.source || 'Unknown',
          imageUrl: article.image_url,
          category: article.category as 'cybersecurity' | 'hacking' | 'general',
          what: article.what,
          whyThisMatters: article.why_this_matters
        }));
        
        // Update state with articles from Supabase
        dispatch({ type: 'SET_ARTICLES', payload: processedArticles });
        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
        dispatch({ type: 'SET_LOADING', payload: false });
        
        console.log('NewsContext: fetchNews completed successfully with Supabase data');
        return;
      } else {
        console.error('NewsContext: Failed to fetch from Supabase:', result.error);
        
        // Fallback to local storage if Supabase fails
        console.log('NewsContext: Falling back to local storage...');
        let allArticles = await ArticleStorageService.getArticles();
        console.log(`NewsContext: Total articles in local storage: ${allArticles.length}`);
      
        // Migrate articles to ensure they have authorDisplay field
        allArticles = allArticles.map(article => ({
          ...article,
          authorDisplay: article.authorDisplay || article.author || article.source || 'Unknown'
        }));
        
        // Update state with local articles
        dispatch({ type: 'SET_ARTICLES', payload: allArticles });
        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
        dispatch({ type: 'SET_LOADING', payload: false });
        
        console.log('NewsContext: Using fallback local storage data');
      }

    } catch (error) {
      console.error('NewsContext: Error in fetchNews:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch news';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
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
          const categoryArticles = await NewsService.fetchNewsFromAPI(1);
          if (categoryArticles.length > 0) {
            allNewArticles = [...allNewArticles, ...categoryArticles];
            console.log(`NewsContext: Fetched ${categoryArticles.length} articles for ${category}`);
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
      
      // AI summarization is now handled by GitHub Actions
      // Articles are pre-processed and stored in Supabase
      console.log('NewsContext: AI processing handled by GitHub Actions - using pre-processed articles');
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
      // Fetch fresh articles from Supabase
      console.log('NewsContext: Refreshing articles from Supabase...');
      const supabaseService = SupabaseArticleService.getInstance();
      const result = await supabaseService.getArticles({ limit: 50 });
      
      if (result.success && result.data) {
        console.log(`NewsContext: Refreshed ${result.data.articles.length} articles from Supabase`);
        
        // Transform Supabase articles to ProcessedArticle format
        const processedArticles: ProcessedArticle[] = result.data.articles.map(article => ({
          id: article.id,
          title: article.title,
          sourceUrl: article.source_url || '',
          publishedAt: article.published_at || new Date().toISOString(),
          source: article.source || 'Unknown',
          rawContent: article.content || '',
          summary: article.summary,
          impact: article.impact,
          takeaways: article.takeaways,
          author: article.author,
          authorDisplay: article.author || article.source || 'Unknown',
          imageUrl: article.image_url,
          category: article.category as 'cybersecurity' | 'hacking' | 'general',
          what: article.what,
          whyThisMatters: article.why_this_matters
        }));
        
        // Update state with fresh articles from Supabase
        dispatch({ type: 'SET_ARTICLES', payload: processedArticles });
        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
        dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 }); // Reset page
        dispatch({ type: 'SET_HAS_MORE', payload: true }); // Reset hasMore
      } else {
        console.error('NewsContext: Failed to refresh from Supabase:', result.error);
        // Fallback to local storage
        const allArticles = await ArticleStorageService.getArticles();
        dispatch({ type: 'SET_ARTICLES', payload: allArticles });
        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
      }

      // AI summarization is now handled by GitHub Actions
      // Articles are pre-processed and stored in Supabase
      console.log('NewsContext: AI processing handled by GitHub Actions - using pre-processed articles');
      
      // Update storage stats
      const stats = await ArticleStorageService.getStorageStats();
      dispatch({ type: 'SET_STORAGE_STATS', payload: stats });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh news';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_REFRESHING', payload: false });
    }
  }, []);

  const loadMoreNews = useCallback(async () => {
    if (state.loadingMore || !state.hasMore) return;
    
    dispatch({ type: 'SET_LOADING_MORE', payload: true });
    
    try {
      const nextPage = state.currentPage + 1;
      const moreArticles = await NewsService.loadMoreNews(nextPage);
      
      if (moreArticles.length > 0) {
        // Save new articles to storage
        await saveArticlesToBoth(moreArticles);
        
        // Get all articles from storage
        const allArticles = await ArticleStorageService.getArticles();
        
        // Update state with all articles
        dispatch({ type: 'SET_ARTICLES', payload: allArticles });
        dispatch({ type: 'SET_CURRENT_PAGE', payload: nextPage });
        
        // Update storage stats
        const stats = await ArticleStorageService.getStorageStats();
        dispatch({ type: 'SET_STORAGE_STATS', payload: stats });
        
        // If we got fewer articles than expected, we might be at the end
        if (moreArticles.length < 10) {
          dispatch({ type: 'SET_HAS_MORE', payload: false });
        }
      } else {
        // No more articles available
        dispatch({ type: 'SET_HAS_MORE', payload: false });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load more news';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING_MORE', payload: false });
    }
  }, [state.loadingMore, state.hasMore, state.currentPage]);

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

  // Initialize storage and load existing articles
  const initializeStorage = useCallback(async () => {
    try {
      console.log('NewsContext: Initializing storage...');
      
      // First, clean up any existing duplicates
      const duplicatesRemoved = await ArticleStorageService.removeDuplicates();
      if (duplicatesRemoved > 0) {
        console.log(`NewsContext: Cleaned up ${duplicatesRemoved} duplicate articles`);
      }
      
      // Load existing articles from storage
      const existingArticles = await ArticleStorageService.getArticles();
      console.log(`NewsContext: Found ${existingArticles.length} existing articles in storage`);
      
      if (existingArticles.length > 0) {
        dispatch({ type: 'SET_ARTICLES', payload: existingArticles });
        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
        
        // Update storage stats
        const stats = await ArticleStorageService.getStorageStats();
        dispatch({ type: 'SET_STORAGE_STATS', payload: stats });
        
        console.log(`NewsContext: Initialized with ${existingArticles.length} existing articles from storage`);
      } else {
        console.log('NewsContext: No existing articles found in storage');
      }
      
      dispatch({ type: 'SET_INITIALIZED', payload: true });
      console.log('NewsContext: Initialization complete');
    } catch (error) {
      console.error('NewsContext: Failed to initialize storage:', error);
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    }
  }, []);

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
