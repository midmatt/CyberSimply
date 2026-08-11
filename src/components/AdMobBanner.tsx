import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
// Type-only: erased at compile time, so this never triggers a native lookup.
import type { BannerAdProps } from 'react-native-google-mobile-ads';
import { useAdManager } from '../services/adManager';
import { adService } from '../services/adService';
import { getMobileAds } from '../services/googleMobileAds';
import { SPACING } from '../constants';

interface AdMobBannerProps {
  position?: 'top' | 'bottom' | 'inline';
  size?: 'banner' | 'large' | 'medium' | 'small';
  onAdPress?: () => void;
  showCloseButton?: boolean;
}

function mapSize(
  size: AdMobBannerProps['size'],
  BannerAdSize: NonNullable<ReturnType<typeof getMobileAds>>['BannerAdSize'],
): BannerAdProps['size'] {
  switch (size) {
    case 'large':
      return BannerAdSize.LARGE_BANNER;
    case 'medium':
      return BannerAdSize.MEDIUM_RECTANGLE;
    case 'small':
      return BannerAdSize.BANNER;
    case 'banner':
    default:
      return BannerAdSize.ANCHORED_ADAPTIVE_BANNER;
  }
}

export function AdMobBannerComponent({ size = 'banner' }: AdMobBannerProps) {
  const { shouldShowAds, logAdDecision } = useAdManager();
  const [failed, setFailed] = useState(false);

  // Resolved once per module load; null when the binary lacks the native module.
  const sdk = getMobileAds();

  useEffect(() => {
    logAdDecision('AdMobBanner', shouldShowAds);
  }, [shouldShowAds, logAdDecision]);

  useEffect(() => {
    void adService.initialize();
  }, []);

  if (!shouldShowAds || Platform.OS === 'web' || failed || !sdk) {
    return null;
  }

  const { BannerAd, BannerAdSize } = sdk;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adService.getBannerAdUnitId()}
        size={mapSize(size, BannerAdSize)}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
          keywords: ['cybersecurity', 'privacy', 'technology', 'security'],
        }}
        onAdLoaded={() => {
          console.log('[AdMob] Banner loaded');
          setFailed(false);
        }}
        onAdFailedToLoad={(error) => {
          console.warn('[AdMob] Banner failed to load:', error);
          setFailed(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: SPACING.sm,
    overflow: 'hidden',
  },
});
