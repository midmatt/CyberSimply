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
import { TYPOGRAPHY, SPACING } from '../constants';
import { AD_CONFIG } from '../constants/adConfig';

interface AdMobBannerProps {
  position?: 'top' | 'bottom' | 'inline';
  size?: 'banner' | 'large' | 'medium' | 'small';
  onAdPress?: () => void;
  showCloseButton?: boolean;
}

export function AdMobBannerComponent({
  position = 'inline',
  size = 'banner',
  onAdPress,
  showCloseButton = false
}: AdMobBannerProps) {
  const { colors } = useTheme();
  const { isAdFree } = useAdFree();
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginVertical: SPACING.sm,
    },
    adLabel: {
      position: 'absolute',
      top: 0,
      left: 0,
      backgroundColor: colors.accent,
      paddingHorizontal: SPACING.xs,
      paddingVertical: 2,
      borderBottomRightRadius: 8,
      zIndex: 1,
    },
    adLabelText: {
      ...TYPOGRAPHY.caption,
      color: colors.cardBackground,
      fontSize: 10,
      fontWeight: '600',
    },
    closeButton: {
      position: 'absolute',
      top: SPACING.xs,
      right: SPACING.xs,
      padding: SPACING.xs,
      zIndex: 2,
    },
    loadingContainer: {
      padding: SPACING.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 60,
    },
    loadingText: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginTop: SPACING.sm,
    },
    errorContainer: {
      padding: SPACING.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 60,
    },
    errorText: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      textAlign: 'center',
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
    if (onAdPress) {
      onAdPress();
    } else {
      Alert.alert(
        'Advertisement',
        'This is a Google AdMob advertisement. Clicking will open relevant content.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Learn More', 
            onPress: () => Linking.openURL('https://admob.google.com/') 
          },
        ]
      );
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleAdLoaded = () => {
    console.log('AdMobBanner: Ad loaded successfully');
    setIsLoading(false);
    setError(null);
  };

  const handleAdFailedToLoad = (error: any) => {
    console.error('AdMobBanner: Ad failed to load:', error);
    setIsLoading(false);
    setError('Ad failed to load');
  };

  // Don't show ads if user has ad-free access
  if (isAdFree) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  // Show loading state
  if (isLoading) {
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

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>Loading advertisement...</Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (error) {
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

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color={colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  // Render mock AdMob banner (Expo managed workflow compatible)
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

      <TouchableOpacity 
        style={styles.loadingContainer}
        onPress={handleAdPress}
        activeOpacity={0.7}
      >
        <Ionicons name="shield" size={24} color={colors.accent} />
        <Text style={styles.loadingText}>
          {AD_CONFIG.ADMOB.TEST_MODE ? 'Test Ad - Google AdMob' : 'Advertisement'}
        </Text>
        <Text style={[styles.loadingText, { fontSize: 12, marginTop: 4 }]}>
          {AD_CONFIG.ADMOB.TEST_MODE 
            ? 'This is a test advertisement for development' 
            : 'Cybersecurity News - Stay informed about security threats'
          }
        </Text>
        {AD_CONFIG.ADMOB.TEST_MODE && (
          <Text style={[styles.loadingText, { fontSize: 10, marginTop: 2, fontStyle: 'italic' }]}>
            Ad Unit ID: {AD_CONFIG.ADMOB.BANNER_AD_UNIT_ID}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
