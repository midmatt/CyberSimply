/**
 * Supabase Configuration
 * 
 * Replace these with your actual Supabase project credentials
 * You can find these in your Supabase project dashboard under Settings > API
 */

export const SUPABASE_URL = 'https://uaykrxfhzfkhjwnmvukb.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWtyeGZoemZraGp3bm12dWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjI1ODMsImV4cCI6MjA3MzA5ODU4M30.V4cd5JiLwAgjNUk-VTBicIp52PuH2FAp_UsZMRPlR40'; // Replace with your actual anon key

// Optional: Service role key for server-side operations
export const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWtyeGZoemZraGp3bm12dWtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUyMjU4MywiZXhwIjoyMDczMDk4NTgzfQ.b83X-KvDkcWyt1i_nXWvaIb2YNxwD3Gk_rKguWzJTyo'; // Replace with your actual service role key

// Database table names
export const TABLES = {
  USER_PROFILES: 'user_profiles',
  ARTICLES: 'articles',
  CATEGORIES: 'categories',
  USER_FAVORITES: 'user_favorites',
  READING_HISTORY: 'reading_history',
  SEARCH_HISTORY: 'search_history',
  USER_PREFERENCES: 'user_preferences',
  USAGE_ANALYTICS: 'usage_analytics',
  ARTICLE_METRICS: 'article_metrics',
  NOTIFICATION_TOKENS: 'notification_tokens',
  NOTIFICATION_PREFERENCES: 'notification_preferences',
  DONORS: 'donors',
} as const;

// RPC function names
export const RPC_FUNCTIONS = {
  GET_ARTICLE_DETAILS: 'get_article_details',
  GET_USER_DASHBOARD: 'get_user_dashboard',
  SEARCH_ARTICLES: 'search_articles',
  GET_TRENDING_ARTICLES: 'get_trending_articles',
  GET_RECOMMENDED_ARTICLES: 'get_recommended_articles',
} as const;

// Event types for analytics
export const ANALYTICS_EVENTS = {
  ARTICLE_VIEW: 'article_view',
  ARTICLE_FAVORITE: 'article_favorite',
  ARTICLE_UNFAVORITE: 'article_unfavorite',
  ARTICLE_SHARE: 'article_share',
  SEARCH_PERFORMED: 'search_performed',
  CATEGORY_SELECTED: 'category_selected',
  THEME_CHANGED: 'theme_changed',
  NOTIFICATION_ENABLED: 'notification_enabled',
  NOTIFICATION_DISABLED: 'notification_disabled',
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  BREAKING_NEWS: 'breaking_news',
  DAILY_DIGEST: 'daily_digest',
  WEEKLY_ROUNDUP: 'weekly_roundup',
  SECURITY_ALERT: 'security_alert',
  FAVORITE_UPDATE: 'favorite_update',
} as const;

// Theme options
export const THEME_OPTIONS = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

// Digest frequency options
export const DIGEST_FREQUENCY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;

// Default user preferences
export const DEFAULT_USER_PREFERENCES = {
  theme: THEME_OPTIONS.SYSTEM,
  notifications_enabled: true,
  email_digest_enabled: true,
  digest_frequency: DIGEST_FREQUENCY.DAILY,
  preferred_categories: ['cybersecurity', 'hacking', 'general'] as string[],
  ai_summaries_enabled: true,
};

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  breaking_news: true,
  daily_digest: true,
  weekly_roundup: true,
  security_alerts: true,
} as const;
