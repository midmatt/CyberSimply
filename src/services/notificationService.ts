import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export interface NotificationSettings {
  enabled: boolean;
  time: string; // Format: "HH:MM" (24-hour)
  timezone: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private notificationListener: any = null;
  private responseListener: any = null;

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
   * Initialize the notification service
   */
  public async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if device supports notifications
      if (!Device.isDevice) {
        return { success: false, error: 'Push notifications are not supported on simulators' };
      }

      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return { success: false, error: 'Notification permissions not granted' };
      }

      // Get push token
      const token = await this.getPushToken();
      if (token) {
        console.log('Push notification token:', token);
        // Store token for server use if needed
        await AsyncStorage.setItem('pushToken', token);
      }

      return { success: true };
    } catch (error) {
      console.error('Notification initialization error:', error);
      return { success: false, error: 'Failed to initialize notifications' };
    }
  }

  /**
   * Get push notification token
   */
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

      const token = await Notifications.getExpoPushTokenAsync();

      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Schedule daily news notification
   */
  public async scheduleDailyNotification(time: string = '09:00'): Promise<{ success: boolean; error?: string }> {
    try {
      // Cancel existing daily notifications
      await this.cancelDailyNotifications();

      // Parse time (format: "HH:MM")
      const [hours, minutes] = time.split(':').map(Number);
      
      // Create trigger for daily notification
      const trigger: Notifications.DailyTriggerInput = {
        hour: hours,
        minute: minutes,
      };

      // Schedule the notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📰 Your Daily Cybersecurity News',
          body: 'Stay updated with the latest cybersecurity insights and threats. Tap to read today\'s top stories!',
          data: { 
            type: 'daily_news',
            screen: 'HomeScreen'
          },
          sound: 'default',
        },
        trigger,
        identifier: 'daily-news-notification',
      });

      // Save notification settings
      const settings: NotificationSettings = {
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

  /**
   * Cancel daily notifications
   */
  public async cancelDailyNotifications(): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync('daily-news-notification');
      console.log('Daily notifications cancelled');
    } catch (error) {
      console.error('Error cancelling daily notifications:', error);
    }
  }

  /**
   * Get notification settings
   */
  public async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      if (settings) {
        return JSON.parse(settings);
      }
    } catch (error) {
      console.error('Error getting notification settings:', error);
    }

    // Return default settings
    return {
      enabled: false,
      time: '09:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  /**
   * Update notification settings
   */
  public async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<{ success: boolean; error?: string }> {
    try {
      const currentSettings = await this.getNotificationSettings();
      const newSettings = { ...currentSettings, ...settings };
      
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));

      // If notifications are enabled, reschedule with new time
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

  /**
   * Send immediate test notification
   */
  public async sendTestNotification(): Promise<{ success: boolean; error?: string }> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Test Notification',
          body: 'This is a test notification from CyberSimply!',
          data: { type: 'test' },
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2 
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending test notification:', error);
      return { success: false, error: 'Failed to send test notification' };
    }
  }

  /**
   * Setup notification listeners
   */
  private setupNotificationListeners(): void {
    // Listen for notifications received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      const data = response.notification.request.content.data;
      if (data?.screen) {
        // Navigate to specific screen if needed
        // This would require navigation context
        console.log('Navigate to:', data.screen);
      }
    });
  }

  /**
   * Clean up listeners
   */
  public cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  /**
   * Check if notifications are enabled
   */
  public async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  /**
   * Get all scheduled notifications
   */
  public async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
