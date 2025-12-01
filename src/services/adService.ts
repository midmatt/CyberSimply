// Ad Service for Google AdMob integration
// This service manages ad loading, display, and tracking

export interface AdConfig {
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  rewardedAdUnitId: string;
  testMode: boolean;
}

export interface AdBannerData {
  id: string;
  title: string;
  description: string;
  cta: string;
  imageUrl?: string;
  targetUrl?: string;
  category: 'cybersecurity' | 'general' | 'premium';
}

export class AdService {
  private static instance: AdService;
  private config: AdConfig;
  private isInitialized: boolean = false;

  private constructor() {
    // Use Google test IDs for now
    this.config = {
      bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111', // Google test banner ID
      interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712', // Google test interstitial ID
      rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917', // Google test rewarded ID
      testMode: true, // Always use test mode for now
    };
  }

  public static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  /**
   * Initialize the ad service
   * Call this when the app starts
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Ad Service: Already initialized');
      return;
    }

    try {
      console.log('Ad Service: Initializing...');
      
      // In a real implementation, you would initialize AdMob here
      // For now, we'll simulate initialization
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.isInitialized = true;
      console.log('Ad Service: Initialized successfully');
      console.log(`Ad Service: Banner ID: ${this.config.bannerAdUnitId}`);
      console.log(`Ad Service: Interstitial ID: ${this.config.interstitialAdUnitId}`);
      console.log(`Ad Service: Test Mode: ${this.config.testMode}`);
    } catch (error) {
      console.error('Ad Service: Failed to initialize', error);
      this.isInitialized = true; // Set to true so we can still show fallback ads
    }
  }

  /**
   * Load a banner ad
   */
  public async loadBannerAd(): Promise<AdBannerData | null> {
    try {
      console.log('Ad Service: Loading banner ad...');
      console.log(`Ad Service: Using Ad Unit ID: ${this.config.bannerAdUnitId}`);
      
      // Simulate ad loading with shorter delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // In production, this would load a real AdMob banner
      // For now, return mock ad data with real AdMob IDs
      const mockAds: AdBannerData[] = [
        {
          id: `banner-${Date.now()}-1`,
          title: 'Cybersecurity Training',
          description: 'Learn essential security skills online',
          cta: 'Start Learning',
          category: 'cybersecurity',
          targetUrl: 'https://example.com/security-training'
        },
        {
          id: `banner-${Date.now()}-2`,
          title: 'VPN Protection',
          description: 'Secure your online privacy today',
          cta: 'Get Protected',
          category: 'cybersecurity',
          targetUrl: 'https://example.com/vpn'
        },
        {
          id: `banner-${Date.now()}-3`,
          title: 'Password Manager',
          description: 'Generate and store secure passwords',
          cta: 'Try Now',
          category: 'cybersecurity',
          targetUrl: 'https://example.com/passwords'
        },
        {
          id: `banner-${Date.now()}-4`,
          title: 'Antivirus Software',
          description: 'Protect your devices from malware',
          cta: 'Get Protection',
          category: 'cybersecurity',
          targetUrl: 'https://example.com/antivirus'
        },
        {
          id: `banner-${Date.now()}-5`,
          title: 'Security Awareness',
          description: 'Stay informed about cyber threats',
          cta: 'Learn More',
          category: 'cybersecurity',
          targetUrl: 'https://example.com/security-awareness'
        }
      ];

      // Randomly select an ad
      const randomAd = mockAds[Math.floor(Math.random() * mockAds.length)];
      console.log('Ad Service: Loaded banner ad:', randomAd.title);
      return randomAd;
    } catch (error) {
      console.error('Ad Service: Failed to load banner ad', error);
      // Return a fallback ad instead of null
      return {
        id: `fallback-${Date.now()}`,
        title: 'Cybersecurity News',
        description: 'Stay informed about the latest security threats',
        cta: 'Learn More',
        category: 'cybersecurity',
        targetUrl: 'https://example.com/cybersecurity-news'
      };
    }
  }

  /**
   * Load an interstitial ad
   */
  public async loadInterstitialAd(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      console.log('Ad Service: Loading interstitial ad...');
      console.log(`Ad Service: Using Ad Unit ID: ${this.config.interstitialAdUnitId}`);
      
      // Simulate ad loading
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // In real implementation, this would load an interstitial ad using AdMob
      console.log('Ad Service: Interstitial ad loaded successfully');
      return true;
    } catch (error) {
      console.error('Ad Service: Failed to load interstitial ad', error);
      return false;
    }
  }

  /**
   * Get interstitial ad data (for display purposes)
   */
  public async getInterstitialAd(): Promise<AdBannerData> {
    try {
      console.log('Ad Service: Getting interstitial ad data...');
      
      // Simulate getting ad data
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Return mock interstitial ad data
      const mockInterstitialAds: AdBannerData[] = [
        {
          id: `interstitial-${Date.now()}-1`,
          title: 'Advanced Security Training',
          description: 'Master cybersecurity skills with our comprehensive course',
          cta: 'Start Course',
          category: 'cybersecurity',
          targetUrl: 'https://example.com/advanced-security-training'
        },
        {
          id: `interstitial-${Date.now()}-2`,
          title: 'Enterprise Security Solutions',
          description: 'Protect your business with enterprise-grade security',
          cta: 'Learn More',
          category: 'cybersecurity',
          targetUrl: 'https://example.com/enterprise-security'
        },
        {
          id: `interstitial-${Date.now()}-3`,
          title: 'Security Audit Services',
          description: 'Professional security assessment for your organization',
          cta: 'Get Quote',
          category: 'cybersecurity',
          targetUrl: 'https://example.com/security-audit'
        }
      ];

      // Randomly select an ad
      const randomAd = mockInterstitialAds[Math.floor(Math.random() * mockInterstitialAds.length)];
      console.log('Ad Service: Loaded interstitial ad data:', randomAd.title);
      return randomAd;
    } catch (error) {
      console.error('Ad Service: Failed to get interstitial ad data', error);
      // Return fallback ad data
      return {
        id: `fallback-interstitial-${Date.now()}`,
        title: 'Cybersecurity Solutions',
        description: 'Comprehensive security solutions for your needs',
        cta: 'Explore Now',
        category: 'cybersecurity',
        targetUrl: 'https://example.com/cybersecurity-solutions'
      };
    }
  }

  /**
   * Show an interstitial ad
   */
  public async showInterstitialAd(): Promise<void> {
    try {
      const loaded = await this.loadInterstitialAd();
      if (loaded) {
        // In real implementation, this would show the ad
        console.log('Ad Service: Showing interstitial ad');
      }
    } catch (error) {
      console.error('Ad Service: Failed to show interstitial ad', error);
    }
  }

  /**
   * Load a rewarded ad
   */
  public async loadRewardedAd(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      // Simulate ad loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, this would load a rewarded ad
      return true;
    } catch (error) {
      console.error('Ad Service: Failed to load rewarded ad', error);
      return false;
    }
  }

  /**
   * Show a rewarded ad
   */
  public async showRewardedAd(): Promise<boolean> {
    try {
      const loaded = await this.loadRewardedAd();
      if (loaded) {
        // In real implementation, this would show the ad and return reward status
        console.log('Ad Service: Showing rewarded ad');
        return true; // Simulate successful reward
      }
      return false;
    } catch (error) {
      console.error('Ad Service: Failed to show rewarded ad', error);
      return false;
    }
  }

  /**
   * Track ad impression
   */
  public trackImpression(adId: string, adType: 'banner' | 'interstitial' | 'rewarded'): void {
    try {
      // In real implementation, this would send analytics data
      console.log(`Ad Service: Tracking impression for ${adType} ad ${adId}`);
    } catch (error) {
      console.error('Ad Service: Failed to track impression', error);
    }
  }

  /**
   * Track ad click
   */
  public trackClick(adId: string, adType: 'banner' | 'interstitial' | 'rewarded'): void {
    try {
      // In real implementation, this would send analytics data
      console.log(`Ad Service: Tracking click for ${adType} ad ${adId}`);
    } catch (error) {
      console.error('Ad Service: Failed to track click', error);
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AdConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Ad Service: Configuration updated', this.config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): AdConfig {
    return { ...this.config };
  }

  /**
   * Check if ads are enabled
   */
  public areAdsEnabled(): boolean {
    return this.isInitialized; // Always enabled for test mode
  }

  /**
   * Render a banner ad component for screens
   */
  public renderBannerAd(adData: AdBannerData, onPress?: () => void): any {
    // This would return a React component in a real implementation
    // For now, return the ad data for manual rendering
    return {
      id: adData.id,
      title: adData.title,
      description: adData.description,
      cta: adData.cta,
      imageUrl: adData.imageUrl,
      targetUrl: adData.targetUrl,
      category: adData.category,
      onPress: onPress || (() => {
        console.log('Ad clicked:', adData.title);
        this.trackClick(adData.id, 'banner');
      })
    };
  }

  /**
   * Reset the service (for testing)
   */
  public reset(): void {
    this.isInitialized = false;
    console.log('Ad Service: Reset');
  }
}

// Export singleton instance
export const adService = AdService.getInstance();
