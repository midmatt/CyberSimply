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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { useNavigation } from '@react-navigation/native';
import { storeKitIAPService, AdFreeProduct, PRODUCT_IDS } from '../services/storeKitIAPService';
import { useAdFree } from '../context/AdFreeContext';
import { TYPOGRAPHY, SPACING } from '../constants';

export function AdFreeScreen() {
  const { colors, isDark } = useTheme();
  const { authState } = useSupabase();
  const { isAdFree, refreshAdFreeStatus } = useAdFree();
  const navigation = useNavigation();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [products, setProducts] = useState<AdFreeProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  useEffect(() => {
    initializeIAP();
  }, [authState.user]);

  const initializeIAP = async () => {
    try {
      // Initialize StoreKit IAP service
      const initResult = await storeKitIAPService.initialize();
      if (initResult.success) {
        // Load products
        const loadedProducts = storeKitIAPService.getProducts();
        setProducts(loadedProducts);
        
        // Refresh ad-free status from context
        await refreshAdFreeStatus();
      } else {
        console.error('StoreKit IAP initialization failed:', initResult.error);
      }
    } catch (error) {
      console.error('Error initializing StoreKit IAP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Ad-free status is now managed by the AdFreeContext

  const handlePurchase = async (productId: string) => {
    if (!authState.isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to purchase ad-free access.');
      return;
    }

    const product = storeKitIAPService.getProduct(productId);
    if (!product) {
      Alert.alert('Error', 'Product not found.');
      return;
    }

    // Check if user already has ad-free access
    if (isAdFree) {
      Alert.alert(
        'Already Ad-Free',
        'You already have ad-free access! Use "Restore Purchases" if you need to restore your purchase.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Go Ad-Free',
      `${product.description}\n\nPrice: ${product.localizedPrice}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Purchase', 
          onPress: () => processPayment(productId)
        }
      ]
    );
  };

  const processPayment = async (productId: string) => {
    setIsProcessing(true);
    setSelectedProduct(productId);
    
    try {
      const result = await storeKitIAPService.purchaseProduct(productId);
      
      if (result.success) {
        Alert.alert(
          'Success!',
          'Thank you for your purchase! You now have ad-free access to CyberSimply.',
          [{ text: 'OK', onPress: async () => {
            // Refresh ad-free status from context
            await refreshAdFreeStatus();
            setSelectedProduct(null);
          }}]
        );
      } else {
        // Handle specific error cases
        if (result.error?.includes('already have ad-free access') || 
            result.error?.includes('already has an active subscription') ||
            result.error?.includes('lifetime ad-free access')) {
          Alert.alert(
            'Already Ad-Free',
            result.error,
            [{ text: 'OK', onPress: async () => {
              // Refresh status to show current state
              await refreshAdFreeStatus();
            }}]
          );
        } else {
          Alert.alert('Purchase Failed', result.error || 'Purchase could not be processed. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
      setSelectedProduct(null);
    }
  };

  const handleRestorePurchases = async () => {
    setIsProcessing(true);
    try {
      const result = await storeKitIAPService.restorePurchases();
      
      if (result.success) {
        if (result.restoredPurchases && result.restoredPurchases.length > 0) {
          Alert.alert(
            'Purchases Restored',
            `Successfully restored ${result.restoredPurchases.length} purchase(s).`,
            [{ text: 'OK', onPress: () => refreshAdFreeStatus() }]
          );
        } else {
          Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
        }
      } else {
        Alert.alert('Restore Failed', result.error || 'Failed to restore purchases. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred while restoring purchases.');
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
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      height: 44, // Compact header height
    },
    backButton: {
      padding: SPACING.xs,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.sm,
    },
    headerTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.text,
      fontWeight: '600',
      fontSize: 18, // Slightly smaller title
    },
    headerSpacer: {
      width: 32, // Match back button width
    },
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: SPACING.lg,
      backgroundColor: colors.background,
      flexGrow: 1,
    },
    header: {
      alignItems: 'center',
      marginBottom: SPACING.xl,
      paddingTop: SPACING.lg, // Add some top padding for better spacing
    },
    icon: {
      marginBottom: SPACING.lg, // Increased margin for better spacing
    },
    title: {
      ...TYPOGRAPHY.h1,
      color: colors.text,
      textAlign: 'center',
      marginBottom: SPACING.md, // Increased margin
      fontSize: 28, // Slightly smaller for better proportion
    },
    subtitle: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: SPACING.sm, // Add horizontal padding for better text flow
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
    activeStatusDetails: {
      marginTop: SPACING.md,
      width: '100%',
    },
    statusDetailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.xs,
      paddingHorizontal: SPACING.sm,
    },
    statusDetailText: {
      ...TYPOGRAPHY.body,
      color: colors.text,
      marginLeft: SPACING.sm,
      fontSize: 14,
    },
    benefitsContainer: {
      marginBottom: SPACING.xl,
      paddingHorizontal: SPACING.xs, // Consistent horizontal padding
    },
    benefitsTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.text,
      marginBottom: SPACING.lg, // Increased margin for better spacing
      textAlign: 'center', // Center the title
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'flex-start', // Align to top for better text alignment
      marginBottom: SPACING.md, // Increased margin for better spacing
      paddingHorizontal: SPACING.xs, // Consistent horizontal padding
    },
    benefitIcon: {
      marginRight: SPACING.md, // Increased margin for better spacing
      marginTop: 2, // Slight top margin to align with first line of text
    },
    benefitText: {
      ...TYPOGRAPHY.body,
      color: colors.text,
      flex: 1,
      lineHeight: 22, // Consistent line height
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
    buttonSelected: {
      backgroundColor: colors.accent + '80',
      borderColor: colors.accent,
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
      <SafeAreaView style={styles.container}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={colors.background} 
        />
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={colors.background} 
      />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
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
            ? 'All advertisements have been removed from your experience. Thank you for supporting CyberSimply!'
            : 'Purchase ad-free access to remove all advertisements.'
          }
        </Text>
        {isAdFree && (
          <View style={styles.activeStatusDetails}>
            <View style={styles.statusDetailItem}>
              <Ionicons name="shield-checkmark" size={16} color="#34C759" />
              <Text style={styles.statusDetailText}>Banner ads removed</Text>
            </View>
            <View style={styles.statusDetailItem}>
              <Ionicons name="shield-checkmark" size={16} color="#34C759" />
              <Text style={styles.statusDetailText}>Interstitial ads removed</Text>
            </View>
            <View style={styles.statusDetailItem}>
              <Ionicons name="shield-checkmark" size={16} color="#34C759" />
              <Text style={styles.statusDetailText}>Faster app performance</Text>
            </View>
          </View>
        )}
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
            <View key={product.productId} style={styles.productContainer}>
              <View style={styles.productHeader}>
                <Text style={styles.productName}>{product.title}</Text>
                <Text style={styles.productPrice}>{product.localizedPrice}</Text>
              </View>
              <Text style={styles.productDescription}>{product.description}</Text>
              
              <TouchableOpacity
                style={[
                  styles.button, 
                  isProcessing && styles.buttonDisabled,
                  selectedProduct === product.productId && styles.buttonSelected
                ]}
                onPress={() => handlePurchase(product.productId)}
                disabled={isProcessing}
              >
                {isProcessing && selectedProduct === product.productId ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.background} />
                    <Text style={styles.loadingText}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>
                    {product.type === 'lifetime' ? 'Buy Lifetime' : 'Subscribe Monthly'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))}

          {/* Restore Purchases Button */}
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleRestorePurchases}
            disabled={isProcessing}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Restore Purchases
            </Text>
          </TouchableOpacity>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
