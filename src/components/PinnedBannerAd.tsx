import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAdFree } from '../context/AdFreeContext';
import { useAdManager } from '../services/adManager';
import { AdBanner } from './AdBanner';

interface PinnedBannerAdProps {
  onAdPress?: () => void;
}

/**
 * Pinned banner ad that always appears at the bottom of the screen
 * Cannot be dismissed by the user
 * Only shows for users without ad-free access
 */
export function PinnedBannerAd({ onAdPress }: PinnedBannerAdProps) {
  const { isAdFree } = useAdFree();
  const { shouldShowAds, logAdDecision } = useAdManager();

  // Log ad decision for debugging
  React.useEffect(() => {
    logAdDecision('PinnedBannerAd', shouldShowAds);
  }, [shouldShowAds, logAdDecision]);

  // Don't render if user has ad-free access - COMPLETE HIDE
  if (!shouldShowAds) {
    console.log('🚫 [PinnedBannerAd] Completely hidden - user has ad-free access');
    return null;
  }

  return (
    <View style={styles.container}>
      <AdBanner
        position="bottom"
        size="banner"
        onAdPress={onAdPress}
        showCloseButton={false} // Cannot be dismissed
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000, // Ensure it's above other content
    backgroundColor: 'transparent',
  },
});
