import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAdFree } from '../context/AdFreeContext';
import { useAdManager } from '../services/adManager';
import { adService, AdBannerData } from '../services/adService';

interface BannerAdProps {
  style?: any;
  onAdPress?: (adData: AdBannerData) => void;
}

export function BannerAd({ style, onAdPress }: BannerAdProps) {
  const { colors } = useTheme();
  const { isAdFree } = useAdFree();
  const { shouldShowAds, logAdDecision } = useAdManager();
  const [adData, setAdData] = useState<AdBannerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Log ad decision for debugging
  useEffect(() => {
    logAdDecision('BannerAd', shouldShowAds);
  }, [shouldShowAds, logAdDecision]);

  // Don't render if user has ad-free access - COMPLETE HIDE
  if (!shouldShowAds) {
    console.log('🚫 [BannerAd] Completely hidden - user has ad-free access');
    return null;
  }

  useEffect(() => {
    loadAd();
  }, []);

  const loadAd = async () => {
    try {
      setIsLoading(true);
      
      // Don't show ads if user has ad-free access
      if (!shouldShowAds) {
        console.log('🚫 [BannerAd] Skipping ad load - user has ad-free access');
        setIsLoading(false);
        return;
      }

      // Load banner ad
      const ad = await adService.loadBannerAd();
      if (ad) {
        setAdData(ad);
        adService.trackImpression(ad.id, 'banner');
      }
    } catch (error) {
      console.error('Error loading banner ad:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdPress = () => {
    if (adData) {
      if (onAdPress) {
        onAdPress(adData);
      } else {
        adService.trackClick(adData.id, 'banner');
        console.log('Ad clicked:', adData.title);
      }
    }
  };

  // Don't render anything if user has ad-free access - COMPLETE HIDE
  if (!shouldShowAds) {
    console.log('🚫 [BannerAd] Completely hidden - user has ad-free access');
    return null;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading ad...
        </Text>
      </View>
    );
  }

  if (!adData) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground }, style]}
      onPress={handleAdPress}
      activeOpacity={0.8}
    >
      <View style={styles.adContent}>
        <View style={styles.adHeader}>
          <Text style={[styles.adLabel, { color: colors.textSecondary }]}>
            Advertisement
          </Text>
        </View>
        
        <View style={styles.adBody}>
          <View style={styles.adText}>
            <Text style={[styles.adTitle, { color: colors.text }]} numberOfLines={2}>
              {adData.title}
            </Text>
            <Text style={[styles.adDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {adData.description}
            </Text>
          </View>
          
          <View style={[styles.ctaButton, { backgroundColor: colors.accent }]}>
            <Text style={[styles.ctaText, { color: colors.background }]}>
              {adData.cta}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 12,
  },
  adContent: {
    padding: 12,
  },
  adHeader: {
    marginBottom: 8,
  },
  adLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adText: {
    flex: 1,
    marginRight: 12,
  },
  adTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  adDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  ctaButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
