import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAdFree } from '../context/AdFreeContext';
import { useAdManager } from '../services/adManager';
import { TYPOGRAPHY, SPACING } from '../constants';
import { adService, AdBannerData } from '../services/adService';
import { AD_CONFIG } from '../constants/adConfig';
import { AdMobBannerComponent } from './AdMobBanner';

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
  showCloseButton = false 
}: AdBannerProps) {
  const { colors } = useTheme();
  const { isAdFree } = useAdFree();
  const { shouldShowAds, logAdDecision } = useAdManager();
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [adData, setAdData] = useState<AdBannerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [useRealAdMob, setUseRealAdMob] = useState(false);

  // Log ad decision for debugging
  useEffect(() => {
    logAdDecision('AdBanner', shouldShowAds);
  }, [shouldShowAds, logAdDecision]);

  // Don't render if user has ad-free access - COMPLETE HIDE
  if (!shouldShowAds) {
    console.log('🚫 [AdBanner] Completely hidden - user has ad-free access');
    return null;
  }

  // Retry function for failed ad loads
  const retryLoadAd = () => {
    if (retryCount < 3) {
      console.log(`AdBanner: Retrying ad load (attempt ${retryCount + 1})`);
      setRetryCount(prev => prev + 1);
      setError(null);
      setIsLoading(true);
      loadAd();
    }
  };

  // Load ad data function
  const loadAd = async () => {
    try {
      console.log('AdBanner: Starting ad load...');
      setIsLoading(true);
      setError(null);
      
      // Initialize ad service if not already done
      console.log('AdBanner: Initializing ad service...');
      await adService.initialize();
      
      // Load banner ad
      console.log('AdBanner: Loading banner ad...');
      const ad = await adService.loadBannerAd();
      
      if (ad) {
        console.log('AdBanner: Ad loaded successfully:', ad.title);
        setAdData(ad);
        // Track impression
        adService.trackImpression(ad.id, 'banner');
      } else {
        console.log('AdBanner: No ad returned from service');
        setError('No ad available');
      }
    } catch (err) {
      console.error('AdBanner: Failed to load ad:', err);
      setError('Failed to load ad');
    } finally {
      setIsLoading(false);
      console.log('AdBanner: Ad loading completed');
    }
  };

  // Load ad data when component mounts
  useEffect(() => {
    // Check if we should use real AdMob
    const shouldUseRealAdMob = !AD_CONFIG.ADMOB.TEST_MODE && AD_CONFIG.ADMOB.SHOW_BANNER_ADS;
    setUseRealAdMob(shouldUseRealAdMob);
    
    console.log('AdBanner: Configuration check:', {
      TEST_MODE: AD_CONFIG.ADMOB.TEST_MODE,
      SHOW_BANNER_ADS: AD_CONFIG.ADMOB.SHOW_BANNER_ADS,
      shouldUseRealAdMob,
      BANNER_AD_UNIT_ID: AD_CONFIG.ADMOB.BANNER_AD_UNIT_ID
    });
    
    if (shouldUseRealAdMob) {
      console.log('AdBanner: Using real AdMob integration');
      setIsLoading(false);
    } else {
      console.log('AdBanner: Using fallback ads (TEST_MODE is true)');
      loadAd();
    }
  }, []);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginVertical: SPACING.sm,
    },
    adContent: {
      padding: SPACING.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    adIcon: {
      marginRight: SPACING.md,
    },
    adText: {
      flex: 1,
    },
    adTitle: {
      ...TYPOGRAPHY.caption,
      color: colors.accent,
      fontWeight: '600',
      marginBottom: SPACING.xs,
    },
    adDescription: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginBottom: SPACING.xs,
    },
    ctaButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: 8,
      marginLeft: SPACING.sm,
    },
    ctaText: {
      ...TYPOGRAPHY.caption,
      color: colors.cardBackground,
      fontWeight: '600',
    },
    closeButton: {
      position: 'absolute',
      top: SPACING.xs,
      right: SPACING.xs,
      padding: SPACING.xs,
    },
    adLabel: {
      position: 'absolute',
      top: 0,
      left: 0,
      backgroundColor: colors.accent,
      paddingHorizontal: SPACING.xs,
      paddingVertical: 2,
      borderBottomRightRadius: 8,
    },
    adLabelText: {
      ...TYPOGRAPHY.caption,
      color: colors.cardBackground,
      fontSize: 10,
      fontWeight: '600',
    },
    // Size variations
    banner: {
      minHeight: 60,
    },
    large: {
      minHeight: 90,
    },
    medium: {
      minHeight: 75,
    },
    small: {
      minHeight: 50,
    },
  });

  const handleAdPress = () => {
    if (adData) {
      // Track click
      adService.trackClick(adData.id, 'banner');
      
      if (onAdPress) {
        onAdPress();
      } else if (adData.targetUrl) {
        // Open the ad's target URL
        Linking.openURL(adData.targetUrl);
      } else {
        // Default behavior - show ad info
        Alert.alert(
          'Advertisement',
          `This is a ${adData.category} advertisement. Clicking will open relevant content.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Learn More', 
              onPress: () => Linking.openURL('https://admob.google.com/') 
            },
          ]
        );
      }
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  // Test function to manually reload ad
  const testReloadAd = () => {
    console.log('AdBanner: Manual reload triggered');
    setRetryCount(0);
    setError(null);
    loadAd();
  };

  // Don't show ads if user has ad-free status
  if (isAdFree) {
    console.log('AdBanner: User has ad-free status, hiding ad');
    return null;
  }

  if (!isVisible) {
    console.log('AdBanner: Not visible, returning null');
    return null;
  }

  console.log('AdBanner: Rendering with state:', { isLoading, hasAdData: !!adData, error, retryCount, useRealAdMob });

  // Use real AdMob component if configured
  if (useRealAdMob) {
    return (
      <AdMobBannerComponent
        position={position}
        size={size}
        onAdPress={onAdPress}
        showCloseButton={showCloseButton}
      />
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles[size]]}>
        <View style={styles.adContent}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.adDescription, { marginLeft: SPACING.sm }]}>
            Loading advertisement...
          </Text>
          {__DEV__ && (
            <TouchableOpacity 
              style={[styles.ctaButton, { marginLeft: SPACING.sm }]} 
              onPress={testReloadAd}
            >
              <Text style={styles.ctaText}>Test</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Show error state with fallback ad
  if (error || !adData) {
    return (
      <View style={[styles.container, styles[size]]}>
        <View style={styles.adLabel}>
          <Text style={styles.adLabelText}>AD</Text>
        </View>
        
        {showCloseButton && (
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <View style={styles.adContent}>
          <View style={styles.adIcon}>
            <Ionicons name="shield" size={24} color={colors.accent} />
          </View>
          
          <View style={styles.adText}>
            <Text style={styles.adTitle}>Cybersecurity News</Text>
            <Text style={styles.adDescription}>
              Stay informed about the latest security threats and protection tips
            </Text>
          </View>

          <TouchableOpacity style={styles.ctaButton} onPress={() => {
            if (retryCount < 3) {
              retryLoadAd();
            } else {
              Alert.alert('Advertisement', 'This is a fallback ad. Real ads will appear when available.');
            }
          }}>
            <Text style={styles.ctaText}>
              {retryCount < 3 ? 'Retry' : 'Learn More'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles[size]]}>
      <View style={styles.adLabel}>
        <Text style={styles.adLabelText}>AD</Text>
      </View>
      
      {showCloseButton && (
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      <View style={styles.adContent}>
        <View style={styles.adIcon}>
          <Ionicons 
            name={adData.category === 'cybersecurity' ? 'shield' : 'megaphone'} 
            size={24} 
            color={colors.accent} 
          />
        </View>
        
        <View style={styles.adText}>
          <Text style={styles.adTitle}>{adData.title}</Text>
          <Text style={styles.adDescription}>{adData.description}</Text>
        </View>

        <TouchableOpacity style={styles.ctaButton} onPress={handleAdPress}>
          <Text style={styles.ctaText}>{adData.cta}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
