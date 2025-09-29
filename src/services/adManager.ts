import { useAdFree } from '../context/AdFreeContext';

/**
 * Centralized Ad Manager Service
 * Provides utilities for managing ad display based on user's ad-free status
 */
export class AdManager {
  private static instance: AdManager;

  private constructor() {}

  public static getInstance(): AdManager {
    if (!AdManager.instance) {
      AdManager.instance = new AdManager();
    }
    return AdManager.instance;
  }

  /**
   * Check if ads should be shown for the current user
   * This is the single source of truth for ad display logic
   */
  public shouldShowAds(isAdFree: boolean): boolean {
    const shouldShow = !isAdFree;
    
    console.log('🎯 [AdManager] Should show ads:', shouldShow, {
      isAdFree,
      timestamp: new Date().toISOString()
    });
    
    return shouldShow;
  }

  /**
   * Get ad display configuration based on user's ad-free status
   */
  public getAdConfig(isAdFree: boolean) {
    return {
      showBannerAds: this.shouldShowAds(isAdFree),
      showInterstitialAds: this.shouldShowAds(isAdFree),
      showPinnedBanner: this.shouldShowAds(isAdFree),
      showInlineAds: this.shouldShowAds(isAdFree),
    };
  }

  /**
   * Log ad display decision for debugging
   */
  public logAdDecision(componentName: string, isAdFree: boolean, willShow: boolean) {
    console.log(`🎯 [AdManager] ${componentName}:`, {
      isAdFree,
      willShow,
      timestamp: new Date().toISOString(),
      component: componentName
    });
  }
}

export const adManager = AdManager.getInstance();

/**
 * Hook for easy ad management in components
 */
export function useAdManager() {
  const { isAdFree } = useAdFree();
  
  return {
    shouldShowAds: adManager.shouldShowAds(isAdFree),
    adConfig: adManager.getAdConfig(isAdFree),
    logAdDecision: (componentName: string, willShow: boolean) => 
      adManager.logAdDecision(componentName, isAdFree, willShow),
  };
}
