import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAdFree } from '../context/AdFreeContext';
import { useAdManager } from '../services/adManager';
import { TYPOGRAPHY, SPACING } from '../constants';
import { adService, AdBannerData } from '../services/adService';

interface InterstitialAdProps {
  visible: boolean;
  onClose: () => void;
  onAdPress?: (adData: AdBannerData) => void;
}

/**
 * Dismissible interstitial ad that can be closed by the user
 * Only shows for users without ad-free access
 */
export function InterstitialAd({ visible, onClose, onAdPress }: InterstitialAdProps) {
  const { colors } = useTheme();
  const { isAdFree } = useAdFree();
  const { shouldShowAds, logAdDecision } = useAdManager();
  const [adData, setAdData] = useState<AdBannerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Log ad decision for debugging
  useEffect(() => {
    logAdDecision('InterstitialAd', shouldShowAds);
  }, [shouldShowAds, logAdDecision]);

  // Don't render if user has ad-free access - COMPLETE HIDE
  if (!shouldShowAds) {
    console.log('🚫 [InterstitialAd] Completely hidden - user has ad-free access');
    return null;
  }

  useEffect(() => {
    if (visible) {
      loadAd();
    }
  }, [visible]);

  const loadAd = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const ad = await adService.getInterstitialAd();
      setAdData(ad);
    } catch (err) {
      console.error('Error loading interstitial ad:', err);
      setError('Failed to load ad');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdPress = () => {
    if (adData && onAdPress) {
      onAdPress(adData);
    }
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      margin: SPACING.lg,
      maxWidth: 400,
      width: '90%',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    adLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
      textTransform: 'uppercase',
    },
    closeButton: {
      padding: SPACING.xs,
    },
    content: {
      padding: SPACING.lg,
    },
    adImage: {
      width: '100%',
      height: 200,
      backgroundColor: colors.background,
      borderRadius: 8,
      marginBottom: SPACING.md,
    },
    adTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.text,
      marginBottom: SPACING.sm,
    },
    adDescription: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      marginBottom: SPACING.md,
    },
    ctaButton: {
      backgroundColor: colors.accent,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      borderRadius: 8,
      alignItems: 'center',
    },
    ctaText: {
      ...TYPOGRAPHY.button,
      color: colors.white,
    },
    loadingContainer: {
      padding: SPACING.xl,
      alignItems: 'center',
    },
    errorContainer: {
      padding: SPACING.xl,
      alignItems: 'center',
    },
    errorText: {
      ...TYPOGRAPHY.body,
      color: colors.error,
      textAlign: 'center',
    },
  });

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.adLabel}>Advertisement</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[TYPOGRAPHY.body, { color: colors.text, marginTop: SPACING.sm }]}>
                  Loading ad...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : adData ? (
              <>
                <View style={styles.adImage} />
                <Text style={styles.adTitle}>{adData.title}</Text>
                <Text style={styles.adDescription}>{adData.description}</Text>
                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={handleAdPress}
                >
                  <Text style={styles.ctaText}>{adData.cta}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
