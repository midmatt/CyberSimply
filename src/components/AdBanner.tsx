import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAdManager } from '../services/adManager';
import { AD_CONFIG } from '../constants/adConfig';
import { AdMobBannerComponent } from './AdMobBanner';
import { WebAdBanner } from './WebAdBanner';

interface AdBannerProps {
  position?: 'top' | 'bottom' | 'inline';
  size?: 'banner' | 'large' | 'medium' | 'small';
  onAdPress?: () => void;
  showCloseButton?: boolean;
}

export function AdBanner({
  position = 'inline',
  size = 'banner',
  onAdPress,
  showCloseButton = false,
}: AdBannerProps) {
  const { shouldShowAds, logAdDecision } = useAdManager();

  useEffect(() => {
    logAdDecision('AdBanner', shouldShowAds);
  }, [shouldShowAds, logAdDecision]);

  if (!shouldShowAds || !AD_CONFIG.ADMOB.SHOW_BANNER_ADS) {
    return null;
  }

  if (Platform.OS === 'web') {
    return (
      <WebAdBanner
        position={position}
        size={size}
        onAdPress={onAdPress}
        showCloseButton={showCloseButton}
      />
    );
  }

  return (
    <AdMobBannerComponent
      position={position}
      size={size}
      onAdPress={onAdPress}
      showCloseButton={showCloseButton}
    />
  );
}
