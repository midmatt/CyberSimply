import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';
import { iapService } from '../services/iapService';

export function DonationScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tipProducts, setTipProducts] = useState<any[]>([]);

  useEffect(() => {
    initializeTips();
  }, []);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const initializeTips = async () => {
    try {
      await iapService.initialize();
      const products = iapService.getProducts();
      // Filter for tip products
      const tips = products.filter(p => p.productId.includes('tip'));
      setTipProducts(tips);
    } catch (error) {
      console.error('Error loading tips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTipPurchase = async (productId: string) => {
    setIsProcessing(true);
    try {
      const result = await iapService.purchaseProduct(productId);
      if (result.success) {
        Alert.alert(
          'Thank You! ☕',
          'Your support means the world to us! Thank you for helping keep CyberSimply running.',
          [{ text: 'You\'re Welcome!' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Could not complete purchase');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during purchase');
    } finally {
      setIsProcessing(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      padding: SPACING.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: SPACING.xl,
    },
    title: {
      ...TYPOGRAPHY.h1,
      color: colors.textPrimary,
      marginBottom: SPACING.sm,
      textAlign: 'center',
    },
    subtitle: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: TYPOGRAPHY.body.lineHeight * 1.4,
    },
    section: {
      marginBottom: SPACING.xl,
    },
    sectionTitle: {
      ...TYPOGRAPHY.h2,
      color: colors.textPrimary,
      marginBottom: SPACING.md,
    },
    sectionText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      lineHeight: TYPOGRAPHY.body.lineHeight * 1.4,
      marginBottom: SPACING.md,
    },
    donationCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    donationTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.textPrimary,
      marginBottom: SPACING.sm,
    },
    donationDescription: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      marginBottom: SPACING.md,
      lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginBottom: SPACING.sm,
    },
    buttonText: {
      ...TYPOGRAPHY.button,
      color: colors.cardBackground,
      marginLeft: SPACING.sm,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.accent,
      borderRadius: 12,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    secondaryButtonText: {
      ...TYPOGRAPHY.button,
      color: colors.accent,
      marginLeft: SPACING.sm,
    },
    featureList: {
      marginTop: SPACING.md,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    featureIcon: {
      marginRight: SPACING.sm,
    },
    featureText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      flex: 1,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: SPACING.lg,
      paddingTop: SPACING.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      ...TYPOGRAPHY.h2,
      color: colors.accent,
      marginBottom: SPACING.xs,
    },
    statLabel: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.lg,
      paddingVertical: SPACING.xs,
    },
    backText: {
      ...TYPOGRAPHY.button,
      color: colors.accent,
      marginLeft: SPACING.xs,
    },
  });




  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
          <Text style={styles.backText}>Settings</Text>
        </TouchableOpacity>
        
        <View style={styles.header}>
          <Text style={styles.title}>Support CyberSimply</Text>
          <Text style={styles.subtitle}>
            Help us keep cybersecurity news free and accessible for everyone. 
            Support us with a coffee and help us continue providing high-quality, 
            AI-powered summaries and breaking security updates. I am a full time student and I am doing this in my free time.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Support Us?</Text>
          <Text style={styles.sectionText}>
            CyberSimply is committed to making cybersecurity information accessible 
            to everyone, regardless of technical background. Your support helps us:
          </Text>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={20} color={colors.accent} style={styles.featureIcon} />
              <Text style={styles.featureText}>Maintain free access to security news</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="sparkles" size={20} color={colors.accent} style={styles.featureIcon} />
              <Text style={styles.featureText}>Improve AI-powered article summaries</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="globe" size={20} color={colors.accent} style={styles.featureIcon} />
              <Text style={styles.featureText}>Expand coverage of global security threats</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="phone-portrait" size={20} color={colors.accent} style={styles.featureIcon} />
              <Text style={styles.featureText}>Develop new app features and improvements</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support Us</Text>
          
          {isLoading ? (
            <View style={styles.donationCard}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.donationDescription, { textAlign: 'center', marginTop: SPACING.md }]}>
                Loading tip options...
              </Text>
            </View>
          ) : (
            <>
              {tipProducts.map((tip) => (
                <View key={tip.productId} style={styles.donationCard}>
                  <Text style={styles.donationTitle}>
                    {tip.title || 'Support CyberSimply'}
                  </Text>
                  <Text style={styles.donationDescription}>
                    {tip.description || 'Show your support with a tip'}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.button, isProcessing && styles.buttonDisabled]} 
                    onPress={() => handleTipPurchase(tip.productId)}
                    disabled={isProcessing}
                  >
                    <Ionicons name="cafe" size={24} color={colors.cardBackground} />
                    <Text style={styles.buttonText}>
                      {isProcessing ? 'Processing...' : `${tip.localizedPrice || tip.price}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              {tipProducts.length === 0 && !isLoading && (
                <View style={styles.donationCard}>
                  <Text style={styles.donationTitle}>☕ Tips Coming Soon!</Text>
                  <Text style={styles.donationDescription}>
                    Tip options are being set up. Thank you for your interest in supporting CyberSimply!
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Your Support Achieves</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>100%</Text>
              <Text style={styles.statLabel}>Free Access</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>24/7</Text>
              <Text style={styles.statLabel}>News Updates</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>Future</Text>
              <Text style={styles.statLabel}>App Updates</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thank You!</Text>
          <Text style={styles.sectionText}>
            Every donation, no matter the size, makes a difference. 
            Your support helps us keep the community informed 
            and protected in cybersecurity. Together, we're making the digital world safer for everyone.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
