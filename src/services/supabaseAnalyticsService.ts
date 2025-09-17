import { supabase } from './supabaseClient';
import { TABLES, ANALYTICS_EVENTS } from '../constants/supabaseConfig';

export interface AnalyticsEvent {
  eventType: string;
  eventData?: Record<string, any>;
  sessionId?: string;
  deviceInfo?: Record<string, any>;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model?: string;
  manufacturer?: string;
  osVersion?: string;
  appVersion?: string;
}

export interface AnalyticsMetrics {
  totalEvents: number;
  uniqueUsers: number;
  topEvents: Array<{ eventType: string; count: number }>;
  topArticles: Array<{ articleId: string; views: number }>;
  userEngagement: {
    averageSessionDuration: number;
    averageArticlesPerSession: number;
    favoriteRate: number;
  };
}

export class SupabaseAnalyticsService {
  private static instance: SupabaseAnalyticsService;
  private sessionId: string;
  private deviceInfo: DeviceInfo | null = null;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(): SupabaseAnalyticsService {
    if (!SupabaseAnalyticsService.instance) {
      SupabaseAnalyticsService.instance = new SupabaseAnalyticsService();
    }
    return SupabaseAnalyticsService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set device information for analytics
   */
  public setDeviceInfo(deviceInfo: DeviceInfo): void {
    this.deviceInfo = deviceInfo;
  }

  /**
   * Track an analytics event
   */
  public async trackEvent(
    eventType: string,
    eventData?: Record<string, any>,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const event: AnalyticsEvent = {
        eventType,
        eventData,
        sessionId: this.sessionId,
        deviceInfo: this.deviceInfo || undefined,
      };

      const { error } = await supabase
        .from(TABLES.USAGE_ANALYTICS)
        .insert({
          user_id: userId || null,
          event_type: eventType,
          event_data: eventData || {},
          session_id: this.sessionId,
          device_info: this.deviceInfo || {},
        });

      if (error) {
        console.error('Error tracking analytics event:', error);
        return { success: false, error: error.message };
      }

      console.log(`Analytics event tracked: ${eventType}`);
      return { success: true };
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Track article view
   */
  public async trackArticleView(
    articleId: string,
    userId?: string,
    timeSpent?: number
  ): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent(
      ANALYTICS_EVENTS.ARTICLE_VIEW,
      {
        articleId,
        timeSpent: timeSpent || 0,
      },
      userId
    );
  }

  /**
   * Track article favorite
   */
  public async trackArticleFavorite(
    articleId: string,
    userId?: string,
    isFavorited: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent(
      isFavorited ? ANALYTICS_EVENTS.ARTICLE_FAVORITE : ANALYTICS_EVENTS.ARTICLE_UNFAVORITE,
      {
        articleId,
        isFavorited,
      },
      userId
    );
  }

  /**
   * Track article share
   */
  public async trackArticleShare(
    articleId: string,
    shareMethod: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent(
      ANALYTICS_EVENTS.ARTICLE_SHARE,
      {
        articleId,
        shareMethod,
      },
      userId
    );
  }

  /**
   * Track search performed
   */
  public async trackSearch(
    query: string,
    resultsCount: number,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent(
      ANALYTICS_EVENTS.SEARCH_PERFORMED,
      {
        query,
        resultsCount,
      },
      userId
    );
  }

  /**
   * Track category selection
   */
  public async trackCategorySelection(
    category: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent(
      ANALYTICS_EVENTS.CATEGORY_SELECTED,
      {
        category,
      },
      userId
    );
  }

  /**
   * Track theme change
   */
  public async trackThemeChange(
    theme: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent(
      ANALYTICS_EVENTS.THEME_CHANGED,
      {
        theme,
      },
      userId
    );
  }

  /**
   * Track notification toggle
   */
  public async trackNotificationToggle(
    enabled: boolean,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent(
      enabled ? ANALYTICS_EVENTS.NOTIFICATION_ENABLED : ANALYTICS_EVENTS.NOTIFICATION_DISABLED,
      {
        enabled,
      },
      userId
    );
  }

  /**
   * Track app opened
   */
  public async trackAppOpened(userId?: string): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent(
      ANALYTICS_EVENTS.APP_OPENED,
      {
        timestamp: new Date().toISOString(),
      },
      userId
    );
  }

  /**
   * Track app backgrounded
   */
  public async trackAppBackgrounded(userId?: string): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent(
      ANALYTICS_EVENTS.APP_BACKGROUNDED,
      {
        timestamp: new Date().toISOString(),
      },
      userId
    );
  }

  /**
   * Get analytics metrics (admin only)
   */
  public async getAnalyticsMetrics(
    dateFrom?: string,
    dateTo?: string
  ): Promise<{ success: boolean; data?: AnalyticsMetrics; error?: string }> {
    try {
      let query = supabase
        .from(TABLES.USAGE_ANALYTICS)
        .select('*');

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data: events, error } = await query;

      if (error) {
        console.error('Error fetching analytics metrics:', error);
        return { success: false, error: error.message };
      }

      if (!events || events.length === 0) {
        return {
          success: true,
          data: {
            totalEvents: 0,
            uniqueUsers: 0,
            topEvents: [],
            topArticles: [],
            userEngagement: {
              averageSessionDuration: 0,
              averageArticlesPerSession: 0,
              favoriteRate: 0,
            },
          },
        };
      }

      // Calculate metrics
      const totalEvents = events.length;
      const uniqueUsers = new Set(events.filter(e => e.user_id).map(e => e.user_id)).size;

      // Top events
      const eventCounts = events.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topEvents = Object.entries(eventCounts)
        .map(([eventType, count]) => ({ eventType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top articles (from article view events)
      const articleViews = events
        .filter(e => e.event_type === ANALYTICS_EVENTS.ARTICLE_VIEW)
        .reduce((acc, event) => {
          const articleId = event.event_data?.articleId;
          if (articleId) {
            acc[articleId] = (acc[articleId] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

      const topArticles = Object.entries(articleViews)
        .map(([articleId, views]) => ({ articleId, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // User engagement metrics
      const sessions = new Map<string, { startTime: string; endTime: string; articleCount: number }>();
      
      events.forEach(event => {
        if (!event.session_id) return;
        
        const session = sessions.get(event.session_id) || {
          startTime: event.created_at,
          endTime: event.created_at,
          articleCount: 0,
        };

        if (event.created_at < session.startTime) {
          session.startTime = event.created_at;
        }
        if (event.created_at > session.endTime) {
          session.endTime = event.created_at;
        }
        if (event.event_type === ANALYTICS_EVENTS.ARTICLE_VIEW) {
          session.articleCount++;
        }

        sessions.set(event.session_id, session);
      });

      const sessionDurations = Array.from(sessions.values()).map(session => {
        const start = new Date(session.startTime).getTime();
        const end = new Date(session.endTime).getTime();
        return (end - start) / 1000; // Convert to seconds
      });

      const averageSessionDuration = sessionDurations.length > 0
        ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
        : 0;

      const averageArticlesPerSession = sessions.size > 0
        ? Array.from(sessions.values()).reduce((sum, session) => sum + session.articleCount, 0) / sessions.size
        : 0;

      const favoriteEvents = events.filter(e => e.event_type === ANALYTICS_EVENTS.ARTICLE_FAVORITE).length;
      const viewEvents = events.filter(e => e.event_type === ANALYTICS_EVENTS.ARTICLE_VIEW).length;
      const favoriteRate = viewEvents > 0 ? (favoriteEvents / viewEvents) * 100 : 0;

      const metrics: AnalyticsMetrics = {
        totalEvents,
        uniqueUsers,
        topEvents,
        topArticles,
        userEngagement: {
          averageSessionDuration: Math.round(averageSessionDuration),
          averageArticlesPerSession: Math.round(averageArticlesPerSession * 100) / 100,
          favoriteRate: Math.round(favoriteRate * 100) / 100,
        },
      };

      return { success: true, data: metrics };
    } catch (error) {
      console.error('Error fetching analytics metrics:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get user-specific analytics
   */
  public async getUserAnalytics(
    userId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      let query = supabase
        .from(TABLES.USAGE_ANALYTICS)
        .select('*')
        .eq('user_id', userId);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user analytics:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Clear old analytics data (cleanup)
   */
  public async clearOldAnalytics(daysOld: number = 90): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from(TABLES.USAGE_ANALYTICS)
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.error('Error clearing old analytics:', error);
        return { success: false, deletedCount: 0, error: error.message };
      }

      const deletedCount = data?.length || 0;
      console.log(`Deleted ${deletedCount} old analytics events`);
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error clearing old analytics:', error);
      return { success: false, deletedCount: 0, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Start a new session
   */
  public startNewSession(): void {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Get current session ID
   */
  public getCurrentSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
export const supabaseAnalyticsService = SupabaseAnalyticsService.getInstance();
