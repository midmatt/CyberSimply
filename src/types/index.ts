import { ProcessedArticle } from '../services/newsService';

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  sourceUrl: string;
  source: string;
  publishedAt: string;
  category: ArticleCategory;
  whyItMatters: string[];
  isFavorite: boolean;
}

export type ArticleCategory = 
  | 'Scams to Avoid'
  | 'Privacy Tips'
  | 'Major Breaches'
  | 'Security Basics';

export interface Category {
  id: string;
  name: ArticleCategory;
  icon: string;
  color: string;
  description: string;
}

export interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

export interface NewsApiArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

export interface SerperSearchResult {
  organic: SerperOrganicResult[];
}

export interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface OpenAISummaryRequest {
  article: NewsApiArticle | SerperOrganicResult;
  content: string;
}

export interface OpenAISummaryResponse {
  summary: string;
  whyItMatters: string[];
  category: ArticleCategory;
}

export interface AppSettings {
  largeTextMode: boolean;
  highContrastMode: boolean;
  notificationsEnabled: boolean;
  dailyDigestTime: string;
}

export interface DailyDigest {
  id: string;
  date: string;
  articles: Article[];
  summary: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  CategoryArticles: { 
    category: {
      id: ArticleCategory;
      name: string;
      description: string;
      icon: string;
      color: string;
      articleCount: number;
    };
  };
  Support: undefined;
  AdFree: undefined;
  NotificationSettings: undefined;
  Profile: undefined;
  ArticleDetail: { 
    article: ProcessedArticle; 
    isFavorite: boolean; 
  };
};

export type TabParamList = {
  Favorites: undefined;
  Categories: undefined;
  News: undefined;
  Archive: undefined;
  Settings: undefined;
};
