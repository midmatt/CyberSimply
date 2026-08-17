// src/app/startup/splashDetector.ts
import { Platform } from 'react-native';

// Detect which splash screen library is being used
export function detectSplashLibrary(): 'expo-splash-screen' | 'react-native-bootsplash' | 'none' {
  try {
    // Check if expo-splash-screen is available
    require('expo-splash-screen');
    return 'expo-splash-screen';
  } catch {
    try {
      // Check if react-native-bootsplash is available
      require('react-native-bootsplash');
      return 'react-native-bootsplash';
    } catch {
      return 'none';
    }
  }
}

// Unified splash screen interface
export interface SplashScreen {
  hide(): Promise<void>;
  preventAutoHide(): Promise<void>;
}

// Get the appropriate splash screen implementation
export function getSplashScreen(): SplashScreen | null {
  const library = detectSplashLibrary();
  
  switch (library) {
    case 'expo-splash-screen':
      try {
        const SplashScreen = require('expo-splash-screen');
        return {
          hide: () => SplashScreen.hideAsync(),
          preventAutoHide: () => SplashScreen.preventAutoHideAsync(),
        };
      } catch (error) {
        console.warn('[startup] Failed to load expo-splash-screen:', error);
        return null;
      }
      
    case 'react-native-bootsplash':
      try {
        const RNBootSplash = require('react-native-bootsplash');
        return {
          hide: () => RNBootSplash.hide(),
          preventAutoHide: () => RNBootSplash.preventAutoHide(),
        };
      } catch (error) {
        console.warn('[startup] Failed to load react-native-bootsplash:', error);
        return null;
      }
      
    default:
      console.warn('[startup] No splash screen library detected');
      return null;
  }
}

// Safe splash screen operations with fallbacks
export class SafeSplashScreen {
  private splashScreen: SplashScreen | null;
  
  constructor() {
    this.splashScreen = getSplashScreen();
  }
  
  async hide(): Promise<void> {
    if (!this.splashScreen) {
      console.log('[startup] No splash screen to hide');
      return;
    }
    
    try {
      console.log('[startup] Hiding splash screen...');
      await this.splashScreen.hide();
      console.log('[startup] Splash screen hidden successfully');
    } catch (error) {
      console.warn('[startup] Failed to hide splash screen:', error);
    }
  }
  
  async preventAutoHide(): Promise<void> {
    if (!this.splashScreen) {
      console.log('[startup] No splash screen to prevent auto-hide');
      return;
    }
    
    try {
      console.log('[startup] Preventing splash screen auto-hide...');
      await this.splashScreen.preventAutoHide();
      console.log('[startup] Splash screen auto-hide prevented');
    } catch (error) {
      console.warn('[startup] Failed to prevent splash screen auto-hide:', error);
    }
  }
}
