import { Platform } from 'react-native';
// Type-only: erased at compile time, so this never triggers a native lookup.
import type { InterstitialAd } from 'react-native-google-mobile-ads';
import { AD_CONFIG } from '../constants/adConfig';
import { getMobileAds } from './googleMobileAds';

export interface AdConfig {
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  rewardedAdUnitId: string;
  testMode: boolean;
}

/** @deprecated Kept for web/mock consumers; native banners use BannerAd directly. */
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
  private isInitialized = false;
  private interstitial: InterstitialAd | null = null;
  private interstitialLoaded = false;

  private constructor() {
    this.config = {
      bannerAdUnitId: AD_CONFIG.ADMOB.BANNER_AD_UNIT_ID,
      interstitialAdUnitId: AD_CONFIG.ADMOB.INTERSTITIAL_AD_UNIT_ID,
      rewardedAdUnitId: AD_CONFIG.ADMOB.REWARDED_AD_UNIT_ID,
      testMode: AD_CONFIG.ADMOB.TEST_MODE,
    };
  }

  public static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  public getBannerAdUnitId(): string {
    return this.config.bannerAdUnitId;
  }

  public getInterstitialAdUnitId(): string {
    return this.config.interstitialAdUnitId;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (Platform.OS === 'web') {
      this.isInitialized = true;
      return;
    }

    const sdk = getMobileAds();
    if (!sdk) {
      // Binary has no native module; run ad-free rather than throwing.
      this.isInitialized = true;
      return;
    }

    try {
      console.log('[AdMob] Initializing Mobile Ads SDK...');
      console.log('[AdMob] Banner unit:', this.config.bannerAdUnitId);
      console.log('[AdMob] Test mode:', this.config.testMode);

      const mobileAds = sdk.default;
      const { MaxAdContentRating } = sdk;

      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.T,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        // Only request test ads from Google's test devices in debug.
        testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : [],
      });

      const adapterStatuses = await mobileAds().initialize();
      this.isInitialized = true;
      console.log('[AdMob] Initialized:', adapterStatuses);

      if (AD_CONFIG.ADMOB.SHOW_INTERSTITIAL_ADS) {
        this.preloadInterstitial();
      }
    } catch (error) {
      console.error('[AdMob] Failed to initialize:', error);
      // Mark initialized so callers don't loop forever; banners may still fail to load.
      this.isInitialized = true;
    }
  }

  private preloadInterstitial(): void {
    const sdk = getMobileAds();
    if (!sdk) {
      return;
    }

    const { InterstitialAd, AdEventType } = sdk;

    try {
      this.interstitialLoaded = false;
      this.interstitial = InterstitialAd.createForAdRequest(
        this.config.interstitialAdUnitId,
        {
          requestNonPersonalizedAdsOnly: true,
          keywords: ['cybersecurity', 'privacy', 'technology', 'security'],
        },
      );

      this.interstitial.addAdEventListener(AdEventType.LOADED, () => {
        this.interstitialLoaded = true;
        console.log('[AdMob] Interstitial loaded');
      });

      this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        this.interstitialLoaded = false;
        this.preloadInterstitial();
      });

      this.interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
        this.interstitialLoaded = false;
        console.warn('[AdMob] Interstitial error:', error);
      });

      this.interstitial.load();
    } catch (error) {
      console.warn('[AdMob] Failed to preload interstitial:', error);
    }
  }

  public async showInterstitialAd(): Promise<boolean> {
    try {
      await this.initialize();
      if (!this.interstitial || !this.interstitialLoaded) {
        console.log('[AdMob] Interstitial not ready');
        return false;
      }
      await this.interstitial.show();
      return true;
    } catch (error) {
      console.warn('[AdMob] Failed to show interstitial:', error);
      return false;
    }
  }

  /** @deprecated Use BannerAd component instead. */
  public async loadBannerAd(): Promise<AdBannerData | null> {
    return null;
  }

  public trackImpression(_adId: string, _adType: string): void {}
  public trackClick(_adId: string, _adType: string): void {}
}

export const adService = AdService.getInstance();
