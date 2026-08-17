import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from './supabaseClient';
import { TABLES } from '../constants/supabaseConfig';
import { navigationRef } from '../navigation/navigationRef';
import type { RootStackParamList } from '../types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const BREAKING_NEWS_PREF_KEY = 'breakingNewsEnabled';
const PUSH_TOKEN_KEY = 'pushToken';

const EAS_PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ??
  Constants.easConfig?.projectId ??
  '526c8a77-d747-4a06-a867-9d472d683675';

export interface NotificationSettings {
  enabled: boolean;
  time: string; // Format: "HH:MM" (24-hour)
  timezone: string;
  breakingNewsEnabled: boolean;
}

type NotificationData = {
  type?: string;
  articleId?: string;
  screen?: string;
};

export class NotificationService {
  private static instance: NotificationService;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private handledColdStart = false;

  private constructor() {
    this.setupNotificationListeners();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize permissions, register the Expo token with Supabase, and handle
   * a cold-start notification tap that opened the app.
   */
  public async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!Device.isDevice) {
        return { success: false, error: 'Push notifications are not supported on simulators' };
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return { success: false, error: 'Notification permissions not granted' };
      }

      const token = await this.getPushToken();
      if (token) {
        console.log('Push notification token:', token);
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
        const breakingNewsEnabled = await this.isBreakingNewsEnabled();
        await this.registerTokenWithSupabase(token, breakingNewsEnabled);
      }

      await this.handleColdStartResponse();

      return { success: true };
    } catch (error) {
      console.error('Notification initialization error:', error);
      return { success: false, error: 'Failed to initialize notifications' };
    }
  }

  private async getPushToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId: EAS_PROJECT_ID,
      });

      return typeof pushToken === 'string' ? pushToken : pushToken.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  private async registerTokenWithSupabase(
    token: string,
    breakingNewsEnabled: boolean,
  ): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const row = {
        token,
        platform: Platform.OS,
        is_active: true,
        breaking_news: breakingNewsEnabled,
        user_id: user?.id ?? null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from(TABLES.NOTIFICATION_TOKENS)
        .upsert(row, { onConflict: 'token' });

      if (error) {
        console.error('Failed to register push token:', error.message);
      }
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }

  public async isBreakingNewsEnabled(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(BREAKING_NEWS_PREF_KEY);
      if (stored === null) return true;
      return stored === 'true';
    } catch {
      return true;
    }
  }

  /**
   * Opt this device in/out of remote breaking-news pushes.
   */
  public async setBreakingNewsEnabled(
    enabled: boolean,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await AsyncStorage.setItem(BREAKING_NEWS_PREF_KEY, enabled ? 'true' : 'false');

      const token =
        (await AsyncStorage.getItem(PUSH_TOKEN_KEY)) || (await this.getPushToken());

      if (!token) {
        return {
          success: false,
          error: 'No push token available. Enable notification permission first.',
        };
      }

      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      await this.registerTokenWithSupabase(token, enabled);
      return { success: true };
    } catch (error) {
      console.error('Error updating breaking news preference:', error);
      return { success: false, error: 'Failed to update breaking news preference' };
    }
  }

  public async scheduleDailyNotification(
    time: string = '09:00',
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.cancelDailyNotifications();

      const [hours, minutes] = time.split(':').map(Number);

      const trigger: Notifications.DailyTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Your Daily Cybersecurity News',
          body: "Stay updated with the latest cybersecurity insights and threats. Tap to read today's top stories!",
          data: {
            type: 'daily_news',
            screen: 'HomeScreen',
          },
          sound: 'default',
        },
        trigger,
        identifier: 'daily-news-notification',
      });

      const current = await this.getNotificationSettings();
      const settings: NotificationSettings = {
        ...current,
        enabled: true,
        time,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));

      console.log(`Daily notification scheduled for ${time}`);
      return { success: true };
    } catch (error) {
      console.error('Error scheduling daily notification:', error);
      return { success: false, error: 'Failed to schedule daily notification' };
    }
  }

  public async cancelDailyNotifications(): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync('daily-news-notification');
      console.log('Daily notifications cancelled');
    } catch (error) {
      console.error('Error cancelling daily notifications:', error);
    }
  }

  public async getNotificationSettings(): Promise<NotificationSettings> {
    const breakingNewsEnabled = await this.isBreakingNewsEnabled();

    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      if (settings) {
        return {
          ...JSON.parse(settings),
          breakingNewsEnabled,
        };
      }
    } catch (error) {
      console.error('Error getting notification settings:', error);
    }

    return {
      enabled: false,
      time: '09:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      breakingNewsEnabled,
    };
  }

  public async updateNotificationSettings(
    settings: Partial<NotificationSettings>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (typeof settings.breakingNewsEnabled === 'boolean') {
        const breakingResult = await this.setBreakingNewsEnabled(settings.breakingNewsEnabled);
        if (!breakingResult.success) return breakingResult;
      }

      const currentSettings = await this.getNotificationSettings();
      const newSettings: NotificationSettings = {
        ...currentSettings,
        ...settings,
        breakingNewsEnabled:
          typeof settings.breakingNewsEnabled === 'boolean'
            ? settings.breakingNewsEnabled
            : currentSettings.breakingNewsEnabled,
      };

      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));

      if (newSettings.enabled) {
        await this.scheduleDailyNotification(newSettings.time);
      } else {
        await this.cancelDailyNotifications();
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return { success: false, error: 'Failed to update notification settings' };
    }
  }

  public async sendTestNotification(): Promise<{ success: boolean; error?: string }> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'This is a test notification from CyberSimply!',
          data: { type: 'test' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending test notification:', error);
      return { success: false, error: 'Failed to send test notification' };
    }
  }

  private navigateFromNotificationData(data: NotificationData | undefined): void {
    if (!data) return;

    if (data.type === 'breaking_news' && data.articleId) {
      this.navigateWhenReady('ArticleDetail', {
        articleId: String(data.articleId),
        isFavorite: false,
      });
      return;
    }

    if (data.screen === 'HomeScreen' || data.type === 'daily_news') {
      this.navigateWhenReady('Main');
    }
  }

  private navigateWhenReady<Name extends keyof RootStackParamList>(
    name: Name,
    params?: RootStackParamList[Name],
  ): void {
    const tryNavigate = () => {
      if (!navigationRef.isReady()) return false;
      // @ts-expect-error React Navigation overload variance on optional params
      navigationRef.navigate(name, params);
      return true;
    };

    if (tryNavigate()) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      if (tryNavigate() || attempts >= 40) {
        clearInterval(interval);
      }
    }, 100);
  }

  private async handleColdStartResponse(): Promise<void> {
    if (this.handledColdStart) return;
    this.handledColdStart = true;

    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        this.navigateFromNotificationData(
          response.notification.request.content.data as NotificationData,
        );
      }
    } catch (error) {
      console.error('Error handling cold-start notification:', error);
    }
  }

  private setupNotificationListeners(): void {
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
      this.navigateFromNotificationData(
        response.notification.request.content.data as NotificationData,
      );
    });
  }

  public cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  public async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  public async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }
}

export const notificationService = NotificationService.getInstance();
