import { Platform } from 'react-native';

// Web-compatible platform detection and utilities
export const isWeb = Platform.OS === 'web';
export const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

// Web-compatible storage
export const webStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      return localStorage.getItem(key);
    }
    return null;
  },
  
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      localStorage.setItem(key, value);
    }
  },
  
  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      localStorage.removeItem(key);
    }
  },
  
  async clear(): Promise<void> {
    if (isWeb) {
      localStorage.clear();
    }
  }
};

// Web-compatible file operations
export const webFileService = {
  async pickImage(): Promise<string | null> {
    if (isWeb) {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve(e.target?.result as string || null);
            };
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        };
        input.click();
      });
    }
    return null;
  }
};

// Web-compatible notifications
export const webNotificationService = {
  async requestPermission(): Promise<boolean> {
    if (isWeb && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },
  
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (isWeb && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }
};

// Web-compatible in-app purchases (mock for web)
export const webIAPService = {
  async initialize(): Promise<void> {
    console.log('Web IAP Service: Mock initialization');
  },
  
  async getProducts(): Promise<any[]> {
    console.log('Web IAP Service: Mock getProducts');
    return [];
  },
  
  async purchaseProduct(): Promise<any> {
    console.log('Web IAP Service: Mock purchase');
    return { success: false, error: 'IAP not available on web' };
  },
  
  async restorePurchases(): Promise<any> {
    console.log('Web IAP Service: Mock restore');
    return { success: false, error: 'IAP not available on web' };
  }
};
