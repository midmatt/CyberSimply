import { useEffect } from 'react';
import { useAdManager } from '../services/adManager';
import { adService } from '../services/adService';
import { AD_CONFIG } from '../constants/adConfig';

interface InterstitialAdProps {
  visible: boolean;
  onClose: () => void;
  onAdPress?: () => void;
}

/**
 * Shows a real AdMob interstitial when `visible` becomes true.
 * Renders nothing — the SDK presents a full-screen native ad.
 */
export function InterstitialAd({ visible, onClose }: InterstitialAdProps) {
  const { shouldShowAds, logAdDecision } = useAdManager();

  useEffect(() => {
    logAdDecision('InterstitialAd', shouldShowAds);
  }, [shouldShowAds, logAdDecision]);

  useEffect(() => {
    if (!visible || !shouldShowAds || !AD_CONFIG.ADMOB.SHOW_INTERSTITIAL_ADS) {
      return;
    }

    let cancelled = false;

    (async () => {
      const shown = await adService.showInterstitialAd();
      if (!cancelled) {
        if (!shown) {
          console.log('[AdMob] Interstitial not ready; closing request');
        }
        onClose();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, shouldShowAds, onClose]);

  return null;
}
