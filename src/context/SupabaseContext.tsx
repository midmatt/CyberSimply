import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, AuthUser, AuthState } from '../services/authService';
import { supabaseUserService, UserSettings, NotificationSettings } from '../services/supabaseUserService';
import { supabaseAnalyticsService, DeviceInfo } from '../services/supabaseAnalyticsService';
import { Platform } from 'react-native';

interface SupabaseContextType {
  // Authentication
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  enterGuestMode: () => Promise<{ success: boolean; error?: string }>;
  convertGuestToUser: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: { display_name?: string; avatar_url?: string }) => Promise<{ success: boolean; error?: string }>;
  
  // User Settings
  userSettings: UserSettings | null;
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<{ success: boolean; error?: string }>;
  loadUserSettings: () => Promise<void>;
  
  // Notification Settings
  notificationSettings: NotificationSettings | null;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<{ success: boolean; error?: string }>;
  loadNotificationSettings: () => Promise<void>;
  
  // Analytics
  trackEvent: (eventType: string, eventData?: Record<string, any>) => Promise<void>;
  trackArticleView: (articleId: string, timeSpent?: number) => Promise<void>;
  trackArticleFavorite: (articleId: string, isFavorited: boolean) => Promise<void>;
  trackSearch: (query: string, resultsCount: number) => Promise<void>;
  
  // Loading states
  isLoadingSettings: boolean;
  isLoadingNotifications: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

interface SupabaseProviderProps {
  children: ReactNode;
}

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    isGuest: false,
  });
  
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Initialize analytics device info
  useEffect(() => {
    const deviceInfo: DeviceInfo = {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      model: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device',
      manufacturer: Platform.OS === 'android' ? 'Android' : 'Apple',
      osVersion: Platform.Version.toString(),
      appVersion: '1.0.0', // You can get this from your app config
    };
    
    supabaseAnalyticsService.setDeviceInfo(deviceInfo);
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    console.log('🔐 SupabaseProvider: Setting up auth state subscription...');
    
    const unsubscribe = authService.subscribe((newAuthState) => {
      console.log('🔐 SupabaseProvider: Auth state changed:', {
        isLoading: newAuthState.isLoading,
        isAuthenticated: newAuthState.isAuthenticated,
        isGuest: newAuthState.isGuest
      });
      
      setAuthState(newAuthState);
      
      // Load user settings when user is authenticated
      if (newAuthState.isAuthenticated && newAuthState.user) {
        loadUserSettings();
        loadNotificationSettings();
        trackAppOpened();
      } else {
        setUserSettings(null);
        setNotificationSettings(null);
      }
    });

    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.log('⏰ SupabaseProvider: Auth initialization timeout, forcing ready state');
      if (authState.isLoading) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    }, 15000); // 15 second timeout

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Track app opened
  const trackAppOpened = async () => {
    if (authState.isAuthenticated) {
      await supabaseAnalyticsService.trackAppOpened(authState.user?.id);
    }
  };

  // Authentication methods
  const signIn = async (email: string, password: string) => {
    const result = await authService.signIn({ email, password });
    return result;
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const result = await authService.signUp({ email, password, displayName });
    return result;
  };

  const signOut = async () => {
    if (authState.isAuthenticated) {
      await supabaseAnalyticsService.trackAppBackgrounded(authState.user?.id);
    }
    const result = await authService.signOut();
    return result;
  };

  const resetPassword = async (email: string) => {
    const result = await authService.resetPassword(email);
    return result;
  };

  const updateProfile = async (updates: { display_name?: string; avatar_url?: string }) => {
    const result = await authService.updateProfile(updates);
    return result;
  };

  const enterGuestMode = async () => {
    const result = await authService.enterGuestMode();
    return result;
  };

  const convertGuestToUser = async (email: string, password: string, displayName?: string) => {
    const result = await authService.convertGuestToUser({ email, password, displayName });
    return result;
  };

  // User settings methods
  const loadUserSettings = async () => {
    if (!authState.isAuthenticated || !authState.user) return;
    
    setIsLoadingSettings(true);
    try {
      const result = await supabaseUserService.getUserPreferences(authState.user.id);
      if (result.success && result.data) {
        setUserSettings(result.data);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const updateUserSettings = async (settings: Partial<UserSettings>) => {
    if (!authState.isAuthenticated || !authState.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const result = await supabaseUserService.updateUserPreferences(authState.user.id, settings);
    if (result.success) {
      setUserSettings(prev => prev ? { ...prev, ...settings } : null);
    }
    return result;
  };

  // Notification settings methods
  const loadNotificationSettings = async () => {
    if (!authState.isAuthenticated || !authState.user) return;
    
    setIsLoadingNotifications(true);
    try {
      const result = await supabaseUserService.getNotificationPreferences(authState.user.id);
      if (result.success && result.data) {
        setNotificationSettings(result.data);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    if (!authState.isAuthenticated || !authState.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const result = await supabaseUserService.updateNotificationPreferences(authState.user.id, settings);
    if (result.success) {
      setNotificationSettings(prev => prev ? { ...prev, ...settings } : null);
    }
    return result;
  };

  // Analytics methods
  const trackEvent = async (eventType: string, eventData?: Record<string, any>) => {
    if (authState.isAuthenticated) {
      await supabaseAnalyticsService.trackEvent(eventType, eventData, authState.user?.id);
    }
  };

  const trackArticleView = async (articleId: string, timeSpent?: number) => {
    if (authState.isAuthenticated) {
      await supabaseAnalyticsService.trackArticleView(articleId, authState.user?.id, timeSpent);
    }
  };

  const trackArticleFavorite = async (articleId: string, isFavorited: boolean) => {
    if (authState.isAuthenticated) {
      await supabaseAnalyticsService.trackArticleFavorite(articleId, authState.user?.id, isFavorited);
    }
  };

  const trackSearch = async (query: string, resultsCount: number) => {
    if (authState.isAuthenticated) {
      await supabaseAnalyticsService.trackSearch(query, resultsCount, authState.user?.id);
    }
  };

  const contextValue: SupabaseContextType = {
    // Authentication
    authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    enterGuestMode,
    convertGuestToUser,
    updateProfile,
    
    // User Settings
    userSettings,
    updateUserSettings,
    loadUserSettings,
    
    // Notification Settings
    notificationSettings,
    updateNotificationSettings,
    loadNotificationSettings,
    
    // Analytics
    trackEvent,
    trackArticleView,
    trackArticleFavorite,
    trackSearch,
    
    // Loading states
    isLoadingSettings,
    isLoadingNotifications,
  };

  return (
    <SupabaseContext.Provider value={contextValue}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}
