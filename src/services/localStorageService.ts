import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local storage service for persisting app state
 * Used to prevent flicker during async operations
 */
export class LocalStorageService {
  private static instance: LocalStorageService;

  private constructor() {}

  public static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  // Ad-free status keys
  private static readonly AD_FREE_STATUS_KEY = 'ad_free_status';
  private static readonly AD_FREE_LAST_SYNC_KEY = 'ad_free_last_sync';

  /**
   * Store ad-free status locally
   */
  public async setAdFreeStatus(status: {
    isAdFree: boolean;
    productType?: 'lifetime' | 'subscription';
    expiresAt?: string;
    lastChecked?: string;
  }): Promise<void> {
    try {
      const data = {
        ...status,
        lastChecked: new Date().toISOString(),
        storedAt: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(
        LocalStorageService.AD_FREE_STATUS_KEY,
        JSON.stringify(data)
      );
      
      console.log('💾 [LocalStorage] Ad-free status stored locally:', data);
    } catch (error) {
      console.error('❌ [LocalStorage] Error storing ad-free status:', error);
    }
  }

  /**
   * Get ad-free status from local storage
   */
  public async getAdFreeStatus(): Promise<{
    isAdFree: boolean;
    productType?: 'lifetime' | 'subscription';
    expiresAt?: string;
    lastChecked?: string;
    storedAt?: string;
  } | null> {
    try {
      const data = await AsyncStorage.getItem(LocalStorageService.AD_FREE_STATUS_KEY);
      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);
      console.log('💾 [LocalStorage] Retrieved ad-free status:', parsed);
      return parsed;
    } catch (error) {
      console.error('❌ [LocalStorage] Error retrieving ad-free status:', error);
      return null;
    }
  }

  /**
   * Clear ad-free status from local storage
   */
  public async clearAdFreeStatus(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LocalStorageService.AD_FREE_STATUS_KEY);
      await AsyncStorage.removeItem(LocalStorageService.AD_FREE_LAST_SYNC_KEY);
      console.log('💾 [LocalStorage] Ad-free status cleared');
    } catch (error) {
      console.error('❌ [LocalStorage] Error clearing ad-free status:', error);
    }
  }

  /**
   * Check if local ad-free status is still valid
   * Returns true if status is less than 1 hour old
   */
  public isAdFreeStatusValid(storedAt?: string): boolean {
    if (!storedAt) return false;
    
    try {
      const stored = new Date(storedAt);
      const now = new Date();
      const diffHours = (now.getTime() - stored.getTime()) / (1000 * 60 * 60);
      
      return diffHours < 1; // Valid for 1 hour
    } catch (error) {
      console.error('❌ [LocalStorage] Error validating ad-free status age:', error);
      return false;
    }
  }

  /**
   * Set last sync timestamp
   */
  public async setLastSync(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        LocalStorageService.AD_FREE_LAST_SYNC_KEY,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('❌ [LocalStorage] Error setting last sync:', error);
    }
  }

  /**
   * Get last sync timestamp
   */
  public async getLastSync(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LocalStorageService.AD_FREE_LAST_SYNC_KEY);
    } catch (error) {
      console.error('❌ [LocalStorage] Error getting last sync:', error);
      return null;
    }
  }
}

export const localStorageService = LocalStorageService.getInstance();
