import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from 'react';
import { NewsProvider } from './NewsContext';
import { LocalImageService } from '../services/localImageService';
import { Article, ArticleCategory } from '../types';

interface AppState {
  articles: Article[];
  loading: boolean;
  error: string | null;
  settings: AppSettings;
}

interface AppSettings {
  largeTextMode: boolean;
  highContrastMode: boolean;
  notificationsEnabled: boolean;
  dailyDigestTime: string;
}

type AppAction =
  | { type: 'SET_ARTICLES'; payload: Article[] }
  | { type: 'ADD_ARTICLES'; payload: Article[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'TOGGLE_FAVORITE'; payload: string };

const initialState: AppState = {
  articles: [],
  loading: false,
  error: null,
  settings: {
    largeTextMode: false,
    highContrastMode: false,
    notificationsEnabled: true,
    dailyDigestTime: '09:00',
  },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ARTICLES':
      return { ...state, articles: action.payload, error: null };
    case 'ADD_ARTICLES':
      return { ...state, articles: [...state.articles, ...action.payload], error: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'TOGGLE_FAVORITE':
      return {
        ...state,
        articles: state.articles.map(article =>
          article.id === action.payload
            ? { ...article, isFavorite: !article.isFavorite }
            : article
        )
      };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  fetchNews: () => Promise<void>;
  loadMoreNews: () => Promise<void>;
  toggleFavorite: (articleId: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  getArticlesByCategory: (category: ArticleCategory) => Article[];
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const generateArticles = useCallback(async (startId: number, count: number) => {
    const articles: Article[] = [];
    
    // Predefined article titles for each category
    const articleTitles = {
      'Scams to Avoid': [
        'New Phishing Scam Targets Banking Apps',
        'Fake Tech Support Scam Alert',
        'Ransomware Threat Targets Small Businesses',
        'Social Media Scam Uses Fake Profiles',
        'Email Scam Impersonates Government Agencies',
        'Fake Shopping Website Scam Alert',
        'Investment Scam Promises Unrealistic Returns',
        'Charity Scam Exploits Natural Disasters',
        'Job Scam Requests Personal Information',
        'Tax Scam Threatens Legal Action'
      ],
      'Privacy Tips': [
        'Social Media Privacy Settings Guide',
        'VPN Security Best Practices',
        'Browser Privacy Protection Tips',
        'Smartphone Privacy Settings Guide',
        'Email Privacy and Security Guide',
        'Cloud Storage Privacy Best Practices',
        'Wi-Fi Privacy Protection Guide',
        'App Permissions and Privacy Guide',
        'Digital Footprint Management Guide',
        'Online Shopping Privacy Tips'
      ],
      'Major Breaches': [
        'Major Data Breach Affects Millions',
        'Healthcare Data Breach Exposes Patient Records',
        'Financial Institution Breach Alert',
        'Educational Institution Data Breach',
        'Government Agency Security Breach',
        'Retail Company Customer Data Breach',
        'Social Media Platform Security Breach',
        'Cloud Service Provider Data Breach',
        'Payment Processor Security Incident',
        'Telecommunications Company Breach'
      ],
      'Security Basics': [
        'Essential Privacy Protection Tips',
        'Password Security Best Practices',
        'Two-Factor Authentication Setup Guide',
        'Device Security Fundamentals',
        'Safe Browsing Habits Guide',
        'Email Security Best Practices',
        'Public Wi-Fi Safety Guide',
        'Software Update Security Guide',
        'Backup and Recovery Guide',
        'Digital Security Checklist'
      ]
    };
    
    // Create a balanced mix of articles across all categories
    const categories: ArticleCategory[] = ['Scams to Avoid', 'Privacy Tips', 'Major Breaches', 'Security Basics'];
    
    for (let i = 0; i < count; i++) {
      const id = startId + i;
      
      // Ensure even distribution: cycle through categories
      const categoryIndex = (id - 1) % categories.length;
      const category = categories[categoryIndex];
      
      // Get title from the appropriate category array
      const titleIndex = Math.floor((id - 1) / categories.length) % articleTitles[category].length;
      const title = articleTitles[category][titleIndex];
      
      // Create realistic content based on the category
      let summary = '';
      let content = '';
      
      switch (category) {
        case 'Scams to Avoid':
          summary = `Learn about the latest scams and how to protect yourself from online threats.`;
          content = `This comprehensive guide covers everything you need to know about scams and how to avoid falling victim to cybercriminals.`;
          break;
        case 'Privacy Tips':
          summary = `Discover essential privacy tips to keep your personal information safe online.`;
          content = `Learn the best practices for protecting your privacy in the digital age with this detailed guide.`;
          break;
        case 'Major Breaches':
          summary = `Stay informed about recent data breaches and what you need to do to protect yourself.`;
          content = `Get the latest information about data breaches and learn how to respond if your data is compromised.`;
          break;
        case 'Security Basics':
          summary = `Master the fundamental basics of cybersecurity with this comprehensive guide.`;
          content = `Build a strong foundation in security basics with these essential cybersecurity principles and practices.`;
          break;
      }
      
      const article: Article = {
        id: id.toString(),
        title: title,
        summary: summary,
        content: content,
        imageUrl: await LocalImageService.getDefaultThumbnail({ id: id.toString(), category, title }),
        sourceUrl: 'https://www.consumer.ftc.gov',
        source: 'FTC Consumer',
        publishedAt: new Date(Date.now() - (id - 1) * 24 * 60 * 60 * 1000).toISOString(),
        category: category,
        whyItMatters: [
          'Protect your personal information',
          'Prevent financial losses',
          'Maintain online security',
          'Stay informed about threats'
        ],
        isFavorite: false,
      };
      
      articles.push(article);
    }
    
    return articles;
  }, []);

  const fetchNews = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Generate initial set of articles (12 total = 3 per category)
      const initialArticles = await generateArticles(1, 12);
      dispatch({ type: 'SET_ARTICLES', payload: initialArticles });
    } catch (error) {
      console.error('Error fetching news:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch news. Please try again later.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [generateArticles]);

  const loadMoreNews = useCallback(async () => {
    if (state.loading) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Generate more articles (6 more = 1-2 per category)
      const moreArticles = await generateArticles(state.articles.length + 1, 6);
      
      if (moreArticles.length > 0) {
        dispatch({ type: 'ADD_ARTICLES', payload: moreArticles });
      }
    } catch (error) {
      console.error('Error loading more news:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.loading, state.articles.length, generateArticles]);

  const toggleFavorite = useCallback((articleId: string) => {
    dispatch({ type: 'TOGGLE_FAVORITE', payload: articleId });
  }, []);

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  const getArticlesByCategory = useCallback((category: ArticleCategory | 'all'): Article[] => {
    if (category === 'all') {
      return state.articles;
    }
    // Filter articles by the selected category
    return state.articles.filter(article => article.category === category);
  }, [state.articles]);

  return (
    <NewsProvider>
      <AppContext.Provider value={{
        state,
        fetchNews,
        loadMoreNews,
        toggleFavorite,
        updateSettings,
        getArticlesByCategory,
      }}>
        {children}
      </AppContext.Provider>
    </NewsProvider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
