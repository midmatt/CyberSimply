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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { useNavigation } from '@react-navigation/native';
import { iapService, IAPProduct, PRODUCT_IDS } from '../services/iapService';
import { useAdFree } from '../context/AdFreeContext';
import { TYPOGRAPHY, SPACING } from '../constants';

export function AdFreeScreen() {
  const { colors, isDark } = useTheme();
  const { authState } = useSupabase();
  const { isAdFree, refreshAdFreeStatus } = useAdFree();
  const navigation = useNavigation();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [adFreeStatus, setAdFreeStatus] = useState<{ productType?: 'subscription'; expiresAt?: string } | null>(null);

  useEffect(() => {
    // Initialize for all users (guests and authenticated)
    initializeIAP();
  }, [authState.user]);

  const initializeIAP = async () => {
    try {
      // Initialize StoreKit IAP service
      const initResult = await iapService.initialize();
      // CRITICAL FIX: Always load products, even if IAP initialization fails
      // This ensures purchase buttons are always visible
      const loadedProducts = iapService.getProducts();
      setProducts(loadedProducts);
      
      // If no products loaded, use fallback products
      if (loadedProducts.length === 0) {
        console.log('🔄 [AdFreeScreen] No products loaded, using fallback products');
        const fallbackProducts = [
          {
            productId: 'com.cybersimply.adfree.monthly.2025',
            price: '2.99',
            currency: 'USD',
            title: 'Ad-Free Monthly',
            description: 'Remove all ads with a monthly subscription.',
            localizedPrice: '$2.99/month',
            type: 'subscription' as const,
          },
        ];
        setProducts(fallbackProducts);
      }
      
      if (initResult.success) {
        // Check ad-free status and get product type
        const status = await iapService.checkAdFreeStatus();
        setAdFreeStatus(status);
        
        // Refresh ad-free status from context
        await refreshAdFreeStatus();
      } else {
        console.error('StoreKit IAP initialization failed:', initResult.error);
        
        // Show helpful error message to user (but don't prevent UI from showing)
        if (initResult.error?.includes('sandbox tester account')) {
          Alert.alert(
            'IAP Setup Required',
            'Please sign in with a sandbox tester account in Settings → App Store → Sandbox Account to enable in-app purchases. Buttons will still appear for testing.',
            [{ text: 'OK' }]
          );
        }
        
        // Still try to get ad-free status even if IAP failed
        try {
          const status = await iapService.checkAdFreeStatus();
          setAdFreeStatus(status);
          await refreshAdFreeStatus();
        } catch (statusError) {
          console.log('Could not check ad-free status due to IAP failure');
        }
      }
    } catch (error) {
      console.error('Error initializing StoreKit IAP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Ad-free status is now managed by the AdFreeContext

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Error', 'Could not open link. Please try again.');
    }
  };

  const handlePurchase = async (productId: string) => {
    const products = iapService.getProducts();
    const product = products.find(p => p.productId === productId);
    if (!product) {
      Alert.alert('Error', 'Product not found.');
      return;
    }

    // Check if user already has ad-free access
    if (isAdFree) {
      Alert.alert(
        'Already Ad-Free',
        'You already have ad-free access!',
        [{ text: 'OK' }]
      );
      return;
    }

    // Proceed directly with purchase (Apple IAP compliance: no forced registration)
    proceedWithPurchase(productId);
  };

  const proceedWithPurchase = (productId: string) => {
    const products = iapService.getProducts();
    const product = products.find(p => p.productId === productId);
    if (!product) return;
    
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
      const result = await iapService.purchaseProduct(productId);
      
      if (result.success) {
        // Show optional account creation prompt for guest users (Apple compliant)
        if (authState.isGuest) {
          Alert.alert(
            'Purchase Successful!',
            'Thank you for your purchase! You now have ad-free access.\n\nWant to sync your purchase across devices? Create an account to restore your subscription on other devices (optional).',
            [
              { 
                text: 'Maybe Later', 
                style: 'cancel',
                onPress: async () => {
                  await refreshAdFreeStatus();
                  setSelectedProduct(null);
                }
              },
              { 
                text: 'Create Account', 
                onPress: async () => {
                  await refreshAdFreeStatus();
                  setSelectedProduct(null);
                  navigation.navigate('Auth' as never);
                }
              }
            ]
          );
        } else {
          // For authenticated users, just show success
          Alert.alert(
            'Success!',
            'Thank you for your purchase! You now have ad-free access to CyberSimply.',
            [{ text: 'OK', onPress: async () => {
              await refreshAdFreeStatus();
              setSelectedProduct(null);
            }}]
          );
        }
      } else {
        // Handle specific error cases
        if (result.error?.includes('already have ad-free access') || 
            result.error?.includes('already has an active subscription')) {
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


  const handleCancelSubscription = () => {
    Alert.alert(
      'Manage Subscription',
      'To manage or cancel your monthly subscription:\n\n1. Open the App Store app\n2. Tap your profile icon (top right)\n3. Tap "Subscriptions"\n4. Select "CyberSimply Ad-Free Monthly"\n5. Choose "Cancel Subscription" or modify your plan\n\nNote: In TestFlight, subscriptions may not appear. This feature works in production builds from the App Store.\n\nYour subscription will remain active until the end of the current billing period if cancelled.',
      [{ text: 'Got It' }]
    );
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
    guestMessageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.xl * 2,
    },
    guestTitle: {
      ...TYPOGRAPHY.h2,
      textAlign: 'center',
      marginTop: SPACING.lg,
      marginBottom: SPACING.md,
      fontWeight: '600',
    },
    guestMessage: {
      ...TYPOGRAPHY.body,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: SPACING.xl,
    },
    createAccountButton: {
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: 12,
      minWidth: 200,
    },
    createAccountButtonText: {
      ...TYPOGRAPHY.button,
      textAlign: 'center',
      fontWeight: '600',
    },
    legalLinksContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: SPACING.md,
      marginBottom: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    legalLinksIntro: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: SPACING.xs,
    },
    legalLinksRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    legalLink: {
      ...TYPOGRAPHY.caption,
      color: colors.accent,
      textDecorationLine: 'underline',
      fontWeight: '600',
    },
    legalSeparator: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginHorizontal: SPACING.xs,
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
          {/* Policy Links */}
          <View style={styles.legalLinksContainer}>
            <Text style={styles.legalLinksIntro}>
              By subscribing, you agree to our:
            </Text>
            <View style={styles.legalLinksRow}>
              <TouchableOpacity 
                onPress={() => handleOpenLink('https://cybersimply.notion.site/CyberSimply-Terms-of-Use-EULA-28c47fbd7cc2808ca354c8425c321a34')}
              >
                <Text style={styles.legalLink}>Terms of Use</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}> • </Text>
              <TouchableOpacity 
                onPress={() => handleOpenLink('https://cybersimply.notion.site/CyberSimply-Privacy-Policy-27847fbd7cc280988b72d8c00f3af9d7')}
              >
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>

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
                    Subscribe
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))}

        </>
      )}


      {/* Show cancel subscription button for active monthly subscribers */}
      {isAdFree && adFreeStatus && adFreeStatus.productType === 'subscription' && (
        <View style={{ marginTop: SPACING.lg }}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FF3B30', borderColor: '#FF3B30' }]}
            onPress={handleCancelSubscription}
            disabled={isProcessing}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              Manage Subscription
            </Text>
          </TouchableOpacity>
          <Text style={{ ...TYPOGRAPHY.caption, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.sm }}>
            Cancel or modify your subscription in iOS Settings
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isAdFree 
            ? 'Thank you for your support! Your ad-free access is active.'
            : 'Secure payment processing by Apple. No account required to purchase. Create an account later to sync across devices.'
          }
        </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
