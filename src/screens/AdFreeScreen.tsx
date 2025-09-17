import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { useNavigation } from '@react-navigation/native';
import { iapService, AdFreeProduct } from '../services/iapService';
import { TYPOGRAPHY, SPACING } from '../constants';

export function AdFreeScreen() {
  const { colors, isDark } = useTheme();
  const { authState } = useSupabase();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [isAdFree, setIsAdFree] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [products, setProducts] = useState<AdFreeProduct[]>([]);

  useEffect(() => {
    initializeIAP();
  }, [authState.user]);

  const initializeIAP = async () => {
    try {
      // Initialize IAP service
      const initResult = await iapService.initialize();
      if (initResult.success) {
        // Load products
        const loadedProducts = iapService.getAdFreeProducts();
        setProducts(loadedProducts);
        
        // Check ad-free status
        await checkAdFreeStatus();
      } else {
        console.error('IAP initialization failed:', initResult.error);
      }
    } catch (error) {
      console.error('Error initializing IAP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAdFreeStatus = async () => {
    try {
      const result = await iapService.checkAdFreeStatus();
      setIsAdFree(result.isAdFree || false);
    } catch (error) {
      console.error('Error checking ad-free status:', error);
    }
  };

  const handlePurchase = async () => {
    if (!authState.isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to purchase ad-free access.');
      return;
    }

    Alert.alert(
      'Go Ad-Free',
      'Remove all ads forever and support the development of CyberSafe News for just $9.99.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Purchase', 
          onPress: processPayment
        }
      ]
    );
  };

  const processPayment = async () => {
    setIsProcessing(true);
    try {
      const result = await iapService.presentAdFreePayment();
      
      if (result.success) {
        Alert.alert(
          'Success!',
          'Thank you for your purchase! You now have ad-free access to CyberSafe News.',
          [{ text: 'OK', onPress: () => setIsAdFree(true) }]
        );
      } else {
        Alert.alert('Purchase Failed', result.error || 'Purchase could not be processed. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.md,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      minHeight: 60,
    },
    backButton: {
      padding: SPACING.sm,
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
      minWidth: 40,
      minHeight: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.sm,
    },
    headerTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.text,
      fontWeight: '600',
    },
    headerSpacer: {
      width: 40,
    },
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: SPACING.lg,
      backgroundColor: colors.background,
    },
    header: {
      alignItems: 'center',
      marginBottom: SPACING.xl,
    },
    icon: {
      marginBottom: SPACING.md,
    },
    title: {
      ...TYPOGRAPHY.h1,
      color: colors.text,
      textAlign: 'center',
      marginBottom: SPACING.sm,
    },
    subtitle: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    statusContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: SPACING.lg,
      marginBottom: SPACING.xl,
      alignItems: 'center',
    },
    statusIcon: {
      marginBottom: SPACING.sm,
    },
    statusTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.text,
      marginBottom: SPACING.xs,
    },
    statusText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    benefitsContainer: {
      marginBottom: SPACING.xl,
    },
    benefitsTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.text,
      marginBottom: SPACING.md,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    benefitIcon: {
      marginRight: SPACING.sm,
    },
    benefitText: {
      ...TYPOGRAPHY.body,
      color: colors.text,
      flex: 1,
    },
    productContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: SPACING.lg,
      marginBottom: SPACING.lg,
      borderWidth: 2,
      borderColor: colors.accent,
    },
    productHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    productName: {
      ...TYPOGRAPHY.h3,
      color: colors.text,
    },
    productPrice: {
      ...TYPOGRAPHY.h2,
      color: colors.accent,
      fontWeight: 'bold',
    },
    productDescription: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      marginBottom: SPACING.md,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      padding: SPACING.md,
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    buttonDisabled: {
      backgroundColor: colors.textSecondary,
    },
    buttonText: {
      ...TYPOGRAPHY.button,
      color: colors.background,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.accent,
    },
    secondaryButtonText: {
      color: colors.accent,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      marginLeft: SPACING.sm,
    },
    footer: {
      alignItems: 'center',
      marginTop: SPACING.lg,
    },
    footerText: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={colors.background} 
          translucent 
        />
        <View style={{ paddingTop: insets.top, flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Go Ad-Free</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.content}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={colors.background} 
        translucent 
      />
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: colors.background }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ paddingTop: insets.top, flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Go Ad-Free</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons 
            name={isAdFree ? "checkmark-circle" : "shield"} 
            size={64} 
            color={isAdFree ? "#34C759" : colors.accent} 
          />
        </View>
        <Text style={styles.title}>
          {isAdFree ? 'Ad-Free Active' : 'Go Ad-Free'}
        </Text>
        <Text style={styles.subtitle}>
          {isAdFree 
            ? 'Thank you for supporting CyberSimply! You\'re enjoying an ad-free experience.'
            : 'Remove all advertisements and support the development of CyberSimply.'
          }
        </Text>
      </View>

      <View style={styles.statusContainer}>
        <Ionicons 
          name={isAdFree ? "checkmark-circle" : "information-circle"} 
          size={32} 
          color={isAdFree ? "#34C759" : colors.accent}
          style={styles.statusIcon}
        />
        <Text style={styles.statusTitle}>
          {isAdFree ? 'Ad-Free Status: Active' : 'Ad-Free Status: Inactive'}
        </Text>
        <Text style={styles.statusText}>
          {isAdFree 
            ? 'All advertisements have been removed from your experience.'
            : 'Purchase ad-free access to remove all advertisements.'
          }
        </Text>
      </View>

      {!isAdFree && (
        <>
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>Ad-Free Benefits</Text>
            
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark" size={20} color="#34C759" style={styles.benefitIcon} />
              <Text style={styles.benefitText}>Remove all banner and interstitial ads</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark" size={20} color="#34C759" style={styles.benefitIcon} />
              <Text style={styles.benefitText}>Faster app performance</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark" size={20} color="#34C759" style={styles.benefitIcon} />
              <Text style={styles.benefitText}>Support app development</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark" size={20} color="#34C759" style={styles.benefitIcon} />
              <Text style={styles.benefitText}>Lifetime access - no recurring fees</Text>
            </View>
          </View>

          {products.map((product) => (
            <View key={product.id} style={styles.productContainer}>
              <View style={styles.productHeader}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>${product.price}</Text>
              </View>
              <Text style={styles.productDescription}>{product.description}</Text>
              
              <TouchableOpacity
                style={[styles.button, isProcessing && styles.buttonDisabled]}
                onPress={handlePurchase}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.background} />
                    <Text style={styles.loadingText}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Purchase Now</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isAdFree 
            ? 'Thank you for your support! Your ad-free access is active.'
            : 'Secure payment processing by Apple. Your payment information is handled securely by Apple.'
          }
        </Text>
          </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
