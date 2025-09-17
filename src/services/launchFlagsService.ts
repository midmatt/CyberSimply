import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SEEN_LOGIN_ONCE: 'auth:seenLoginOnce',
  IS_GUEST: 'auth:isGuest',
  STAY_SIGNED_IN: 'auth:staySignedIn',
} as const;

export interface LaunchFlags {
  seenLoginOnce: boolean;
  isGuest: boolean;
  staySignedIn: boolean;
}

export class LaunchFlagsService {
  private static instance: LaunchFlagsService;
  private flags: LaunchFlags = {
    seenLoginOnce: false,
    isGuest: false,
    staySignedIn: false,
  };

  private constructor() {}

  public static getInstance(): LaunchFlagsService {
    if (!LaunchFlagsService.instance) {
      LaunchFlagsService.instance = new LaunchFlagsService();
    }
    return LaunchFlagsService.instance;
  }

  /**
   * Initialize the service by loading flags from storage
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🏁 LaunchFlagsService: Loading flags from storage...');
      
      const [seenLoginOnce, isGuest, staySignedIn] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SEEN_LOGIN_ONCE),
        AsyncStorage.getItem(STORAGE_KEYS.IS_GUEST),
        AsyncStorage.getItem(STORAGE_KEYS.STAY_SIGNED_IN),
      ]);

      this.flags = {
        seenLoginOnce: seenLoginOnce === 'true',
        isGuest: isGuest === 'true',
        staySignedIn: staySignedIn === 'true',
      };

      console.log('✅ LaunchFlagsService: Flags loaded:', this.flags);
    } catch (error) {
      console.error('❌ LaunchFlagsService: Failed to load flags:', error);
    }
  }

  /**
   * Get current flags
   */
  public getFlags(): LaunchFlags {
    return { ...this.flags };
  }

  /**
   * Mark that user has seen login screen once
   */
  public async markSeenLoginOnce(): Promise<void> {
    try {
      this.flags.seenLoginOnce = true;
      await AsyncStorage.setItem(STORAGE_KEYS.SEEN_LOGIN_ONCE, 'true');
      console.log('✅ LaunchFlagsService: Marked seen login once');
    } catch (error) {
      console.error('❌ LaunchFlagsService: Failed to mark seen login once:', error);
    }
  }

  /**
   * Set guest status
   */
  public async setGuest(isGuest: boolean): Promise<void> {
    try {
      this.flags.isGuest = isGuest;
      await AsyncStorage.setItem(STORAGE_KEYS.IS_GUEST, isGuest.toString());
      console.log('✅ LaunchFlagsService: Set guest status:', isGuest);
    } catch (error) {
      console.error('❌ LaunchFlagsService: Failed to set guest status:', error);
    }
  }

  /**
   * Set stay signed in status
   */
  public async setStaySignedIn(staySignedIn: boolean): Promise<void> {
    try {
      this.flags.staySignedIn = staySignedIn;
      await AsyncStorage.setItem(STORAGE_KEYS.STAY_SIGNED_IN, staySignedIn.toString());
      console.log('✅ LaunchFlagsService: Set stay signed in:', staySignedIn);
    } catch (error) {
      console.error('❌ LaunchFlagsService: Failed to set stay signed in:', error);
    }
  }

  /**
   * Check if should show login screen
   */
  public shouldShowLogin(): boolean {
    // Show login if:
    // 1. Haven't seen login screen before, OR
    // 2. Not a guest AND not staying signed in AND no valid session
    return !this.flags.seenLoginOnce || (!this.flags.isGuest && !this.flags.staySignedIn);
  }

  /**
   * Reset all flags (for logout)
   */
  public async reset(): Promise<void> {
    try {
      this.flags = {
        seenLoginOnce: false,
        isGuest: false,
        staySignedIn: false,
      };

      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.SEEN_LOGIN_ONCE),
        AsyncStorage.removeItem(STORAGE_KEYS.IS_GUEST),
        AsyncStorage.removeItem(STORAGE_KEYS.STAY_SIGNED_IN),
      ]);

      console.log('✅ LaunchFlagsService: Reset all flags');
    } catch (error) {
      console.error('❌ LaunchFlagsService: Failed to reset flags:', error);
    }
  }
}

// Export singleton instance
export const launchFlagsService = LaunchFlagsService.getInstance();
