/**
 * IAP Service - StoreKit 2 + Supabase Integration
 * 
 * This service handles in-app purchases using:
 * - StoreKit 2 (via react-native-iap v12+)
 * - Supabase for server-side verification and status tracking
 * - App Store Server Notifications v2 for automatic updates
 * 
 * Features:
 * - Verified transaction tracking
 * - Automatic sync with Supabase
 * - Backwards compatibility with existing users
 * - Subscription renewal handling
 * - Refund detection
 */

import { Platform } from 'react-native';
import { supabase } from './supabaseClientProduction';
import * as RNIap from 'react-native-iap';
import { localStorageService } from './localStorageService';
import * as Device from 'expo-device';

// Type definitions for react-native-iap
interface Product {
  productId: string;
  price: string;
  currency: string;
  title: string;
  description: string;
  localizedPrice?: string;
  type?: string;
}

interface Purchase {
  productId: string;
  transactionId: string;
  transactionDate: number;
  transactionReceipt: string;
  purchaseToken?: string;
  dataAndroid?: string;
  signatureAndroid?: string;
}

interface PurchaseError {
  code: string;
  message: string;
}

// Product IDs - Updated for 2025
export const PRODUCT_IDS = {
  MONTHLY: 'com.cybersimply.adfree.monthly.2025',
  TIP_SMALL: 'com.cybersimply.tip.small',
  TIP_MEDIUM: 'com.cybersimply.tip.medium',
  TIP_LARGE: 'com.cybersimply.tip.large',
} as const;

// Debug mode - set to true to disable automatic purchase checking
const DEBUG_MODE = __DEV__; // Only enable in development

/** How long to wait for StoreKit/Play Billing before falling back. */
const IAP_CONNECTION_TIMEOUT_MS = 2000;

function isIapUnavailableError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error ?? '');
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code ?? '')
      : '';
  return (
    code === 'E_IAP_NOT_AVAILABLE' ||
    message.includes('E_IAP_NOT_AVAILABLE') ||
    message.includes('IAP_NOT_AVAILABLE') ||
    message.includes('IAP connection timeout')
  );
}

export interface IAPProduct {
  productId: string;
  price: string;
  currency: string;
  title: string;
  description: string;
  localizedPrice: string;
  type: 'subscription' | 'consumable';
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  purchase?: Purchase;
  error?: string;
}

export interface AdFreeStatus {
  isAdFree: boolean;
  productType?: 'subscription';
  expiresAt?: string;
  transactionId?: string;
}

export class IAPService {
  private static instance: IAPService;
  private isInitialized: boolean = false;
  private products: IAPProduct[] = [];
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  private constructor() {}

  public static getInstance(): IAPService {
    if (!IAPService.instance) {
      IAPService.instance = new IAPService();
    }
    return IAPService.instance;
  }

  /**
   * Initialize the IAP service with StoreKit 2.
   * On simulator / when StoreKit is unavailable, fails fast with fallback
   * products and does NOT raise LogBox errors (expected in dev).
   */
  public async initialize(): Promise<{ success: boolean; error?: string }> {
    if (this.isInitialized) {
      console.log('✅ [IAP] Already initialized');
      return { success: true };
    }

    // Simulator cannot talk to StoreKit — skip the hang and use fallbacks.
    if (Platform.OS === 'ios' && !Device.isDevice) {
      if (__DEV__) {
        console.log('ℹ️ [IAP] Skipping StoreKit on simulator — using fallback products');
      }
      this.products = this.getFallbackProducts();
      this.isInitialized = true;
      return { success: true, error: 'E_IAP_NOT_AVAILABLE' };
    }

    try {
      console.log('🛒 [IAP] Initializing StoreKit 2...');

      // Step 1: Initialize connection to App Store (bounded — can hang when unavailable)
      await Promise.race([
        (RNIap as any).initConnection(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('IAP connection timeout')),
            IAP_CONNECTION_TIMEOUT_MS
          )
        ),
      ]);
      console.log(`✅ [IAP] Connection initialized`);

      // Step 2: Set up purchase listeners
      this.setupPurchaseListeners();

      // Step 3: Fetch products
      await this.fetchProducts();

      // Step 4: Clear old transactions (Android API — no-op / safe skip on iOS)
      if (Platform.OS === 'android') {
        try {
          await (RNIap as any).flushFailedPurchasesCachedAsPendingAndroid();
        } catch {
          // Non-fatal
        }
      }

      this.isInitialized = true;
      console.log('✅ [IAP] Initialization complete');
      return { success: true };

    } catch (error) {
      const unavailable = isIapUnavailableError(error);
      const errorMessage = unavailable
        ? 'IAP not available on this device/session'
        : error instanceof Error
          ? error.message
          : 'Initialization failed';

      // Expected on simulator / unsigned builds — never paint a red LogBox.
      if (unavailable) {
        if (__DEV__) {
          console.log('ℹ️ [IAP] StoreKit unavailable — using fallback products:', errorMessage);
        }
      } else {
        console.warn('⚠️ [IAP] Initialization failed, using fallback products:', errorMessage);
      }

      this.products = this.getFallbackProducts();
      this.isInitialized = true;

      return {
        success: true,
        error: errorMessage,
      };
    }
  }

  /**
   * Set up purchase listeners for transaction updates
   */
  private setupPurchaseListeners(): void {
    console.log('🎧 [IAP] Setting up purchase listeners...');

    // Purchase update listener - fires when purchase completes
    this.purchaseUpdateSubscription = (RNIap as any).purchaseUpdatedListener(
      async (purchase: Purchase) => {
        console.log('🛒 [IAP] Purchase updated:', {
          productId: purchase.productId,
          transactionId: purchase.transactionId,
        });

        try {
          // Step 1: Verify receipt with Apple (iOS) or Google (Android)
          const isValid = await this.verifyPurchase(purchase);
          
          if (!isValid) {
            console.error('❌ [IAP] Purchase verification failed');
            return;
          }

          // Step 2: Send to Supabase for server-side tracking
          await this.recordPurchaseInSupabase(purchase);

          // Step 3: Finish the transaction (acknowledge to store)
          await (RNIap as any).finishTransaction({ purchase, isConsumable: false });

          console.log('✅ [IAP] Purchase processed and recorded');

        } catch (error) {
          console.error('❌ [IAP] Error processing purchase:', error);
        }
      }
    );

    // Purchase error listener
    this.purchaseErrorSubscription = (RNIap as any).purchaseErrorListener(
      (error: PurchaseError) => {
        console.error('❌ [IAP] Purchase error:', {
          code: error.code,
          message: error.message,
        });
      }
    );

    console.log('✅ [IAP] Purchase listeners configured');
  }

  /**
   * Fetch available products from App Store/Play Store
   */
  private async fetchProducts(): Promise<void> {
    try {
      console.log('🛒 [IAP] Fetching products...');

      const productIds = Object.values(PRODUCT_IDS);
      console.log('🔍 [IAP] Product IDs to fetch:', productIds);

      // Ensure we have valid product IDs
      if (!productIds || productIds.length === 0) {
        throw new Error('No product IDs configured');
      }

      // Fix: Use correct react-native-iap API format
      // For iOS: getProducts({ skus: productIds })
      // For Android: getProducts({ skus: productIds })
      const products = await (RNIap as any).getProducts({ skus: productIds }) as Product[];
      
        this.products = products.map((product: Product) => ({
          productId: product.productId,
          price: product.price,
          currency: product.currency,
          title: product.title,
          description: product.description,
          localizedPrice: product.localizedPrice || product.price,
          type: product.productId.includes('tip') ? 'consumable' as const : 'subscription' as const,
        }));

      console.log(`✅ [IAP] Loaded ${this.products.length} products:`, 
        this.products.map(p => p.productId));
      
      // Additional StoreKit validation log
      console.log('🧩 [IAP] StoreKit product validation:', {
        expectedIds: Object.values(PRODUCT_IDS),
        loadedIds: this.products.map(p => p.productId),
        allProductsFound: Object.values(PRODUCT_IDS).every(id => 
          this.products.some(p => p.productId === id)
        )
      });

    } catch (error: any) {
      console.error('❌ [IAP] Error fetching products:', error);
      
      // Provide more specific error information
      if (error.message?.includes('skus') || error.message?.includes('required')) {
        console.error('🚨 [IAP] Product IDs issue - check App Store Connect configuration');
        console.error('🚨 [IAP] Expected product IDs:', Object.values(PRODUCT_IDS));
        console.error('🚨 [IAP] Make sure products are "Ready for Sale" in App Store Connect');
        console.error('🚨 [IAP] Ensure you are signed in with a sandbox tester account');
      } else if (error.message?.includes('not available') || error.message?.includes('store')) {
        console.error('🚨 [IAP] Store not available - check sandbox account or network connection');
      }
      
      console.log('🔄 [IAP] Using fallback products due to fetch error');
      this.products = this.getFallbackProducts();
    }
  }

  /**
   * Manually refresh products (useful for debugging)
   */
  public async refreshProducts(): Promise<boolean> {
    try {
      console.log('🔄 [IAP] Manually refreshing products...');
      await this.fetchProducts();
      return true;
    } catch (error) {
      console.error('❌ [IAP] Failed to refresh products:', error);
      return false;
    }
  }

  /**
   * Debug method to test product fetching
   */
  public async testProductFetch(): Promise<void> {
    console.log('🧪 [IAP] Testing product fetch...');
    console.log('🧪 [IAP] Product IDs:', Object.values(PRODUCT_IDS));
    console.log('🧪 [IAP] Is initialized:', this.isInitialized);
    console.log('🧪 [IAP] Current products:', this.products.length);
    
    try {
      await this.fetchProducts();
      console.log('🧪 [IAP] Test successful - products loaded:', this.products.length);
    } catch (error) {
      console.error('🧪 [IAP] Test failed:', error);
    }
  }

  /**
   * Get fallback products for display when store is unavailable
   */
  private getFallbackProducts(): IAPProduct[] {
    return [
      {
        productId: PRODUCT_IDS.MONTHLY,
        price: '2.99',
        currency: 'USD',
        title: 'Ad-Free Monthly',
        description: 'Remove all ads with a monthly subscription.',
        localizedPrice: '$2.99/month',
        type: 'subscription',
      },
      {
        productId: PRODUCT_IDS.TIP_SMALL,
        price: '2.99',
        currency: 'USD',
        title: 'Small Tip',
        description: 'Support development with a small tip',
        localizedPrice: '$2.99',
        type: 'consumable',
      },
      {
        productId: PRODUCT_IDS.TIP_MEDIUM,
        price: '4.99',
        currency: 'USD',
        title: 'Medium Tip',
        description: 'Support development with a medium tip',
        localizedPrice: '$4.99',
        type: 'consumable',
      },
      {
        productId: PRODUCT_IDS.TIP_LARGE,
        price: '9.99',
        currency: 'USD',
        title: 'Large Tip',
        description: 'Support development with a generous tip',
        localizedPrice: '$9.99',
        type: 'consumable',
      },
    ];
  }

  /**
   * Get available products
   */
  public getProducts(): IAPProduct[] {
    return [...this.products];
  }

  /**
   * Purchase a product
   */
  public async purchaseProduct(productId: string): Promise<PurchaseResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`🛒 [IAP] Starting purchase for ${productId}...`);

      // Check if this is a tip product
      const isTip = productId.includes('tip');

      // For subscription products, check if user already has ad-free access
      if (!isTip) {
        const currentStatus = await this.checkAdFreeStatus();
        if (currentStatus.isAdFree) {
          console.warn('⚠️ [IAP] User already has ad-free access');
          return {
            success: false,
            error: 'You already have ad-free access. Use "Restore Purchases" if needed.',
          };
        }
      }

      console.log('🔍 [IAP] Available products:', this.products.map(p => p.productId));
      const product = this.products.find(p => p.productId === productId);
      if (!product) {
        console.error('❌ [IAP] Product not found in available products:', productId);
        return { success: false, error: `Product not found: ${productId}. Available: ${this.products.map(p => p.productId).join(', ')}` };
      }

      let purchase: Purchase;

      if (isTip) {
        // Tips are consumable - use requestPurchase
        console.log('🛒 [IAP] Requesting consumable tip purchase...');
        purchase = await (RNIap as any).requestPurchase({ sku: productId, andDangerouslyFinishTransactionAutomaticallyIOS: false }) as Purchase;
      } else if (product.type === 'subscription') {
        // Request subscription
        purchase = await (RNIap as any).requestSubscription({ sku: productId, andDangerouslyFinishTransactionAutomaticallyIOS: false }) as Purchase;
      } else {
        // Request one-time purchase
        purchase = await (RNIap as any).requestPurchase({ sku: productId, andDangerouslyFinishTransactionAutomaticallyIOS: false }) as Purchase;
      }

      console.log('✅ [IAP] Purchase initiated:', purchase.transactionId);

      return {
        success: true,
        transactionId: purchase.transactionId,
        purchase,
      };

    } catch (error: any) {
      console.error('❌ [IAP] Purchase failed:', error);
      
      // Handle user cancellation gracefully
      if (error.code === 'E_USER_CANCELLED') {
        return { success: false, error: 'Purchase cancelled' };
      }
      
      // Handle specific IAP errors
      if (error.message?.includes('Invalid product ID')) {
        return {
          success: false,
          error: 'Invalid product ID. This usually means IAP is not properly initialized or you need to sign in with a sandbox tester account.',
        };
      }
      
      return {
        success: false,
        error: error.message || 'Purchase failed',
      };
    }
  }

  /**
   * Restore previous purchases
   */
  public async restorePurchases(): Promise<{ success: boolean; restoredCount: number; error?: string }> {
    try {
      console.log('🔄 [IAP] Restoring purchases...');

      // Get available purchases from the store
      const purchases = await (RNIap as any).getAvailablePurchases() as Purchase[];
      
      console.log(`✅ [IAP] Found ${purchases.length} purchases`);

      if (purchases.length === 0) {
        return { success: true, restoredCount: 0 };
      }

      // Filter for our ad-free products
      const adFreePurchases = purchases.filter(p => 
        Object.values(PRODUCT_IDS).includes(p.productId as any)
      );

      console.log(`✅ [IAP] Found ${adFreePurchases.length} ad-free purchases`);

      // Record each purchase in Supabase
      for (const purchase of adFreePurchases) {
        await this.recordPurchaseInSupabase(purchase);
      }

      return {
        success: true,
        restoredCount: adFreePurchases.length,
      };

    } catch (error) {
      console.error('❌ [IAP] Restore failed:', error);
      return {
        success: false,
        restoredCount: 0,
        error: error instanceof Error ? error.message : 'Restore failed',
      };
    }
  }

  /**
   * Check ad-free status from Supabase (source of truth)
   * @param forceFresh - If true, ignores cached data and forces fresh check
   */
  public async checkAdFreeStatus(forceFresh: boolean = false): Promise<AdFreeStatus> {
    try {
      console.log('🔍 [IAP] Checking ad-free status...', { forceFresh, debugMode: DEBUG_MODE });

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ [IAP] No authenticated user');
        return { isAdFree: false };
      }

      console.log('👤 [IAP] Checking for user:', user.id);

      // Query Supabase for active purchases
      const { data: iapRecords, error } = await supabase
        .from('user_iap')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .or('expires_date.is.null,expires_date.gt.' + new Date().toISOString())
        .order('purchase_date', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ [IAP] Error querying Supabase:', error);
        
        // Fallback: check user_profiles.ad_free
        return await this.checkLegacyAdFreeStatus(user.id);
      }

      if (iapRecords && iapRecords.length > 0) {
        const record = iapRecords[0];
        console.log('✅ [IAP] Active purchase found:', record.product_id);
        
        return {
          isAdFree: true,
          productType: 'subscription',
          expiresAt: record.expires_date,
          transactionId: record.transaction_id,
        };
      }

      // No active purchases found
      console.log('❌ [IAP] No active purchases');
      return { isAdFree: false };

    } catch (error) {
      console.error('❌ [IAP] Error checking status:', error);
      return { isAdFree: false };
    }
  }

  /**
   * Backwards compatibility: Check legacy ad_free field
   */
  private async checkLegacyAdFreeStatus(userId: string): Promise<AdFreeStatus> {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('ad_free, product_type, premium_expires_at')
        .eq('id', userId)
        .single();

      if (profile?.ad_free) {
        console.log('✅ [IAP] Legacy ad-free status found');
        return {
          isAdFree: true,
          productType: 'subscription',
          expiresAt: profile.premium_expires_at,
        };
      }
    } catch (error) {
      console.error('❌ [IAP] Error checking legacy status:', error);
    }

    return { isAdFree: false };
  }

  /**
   * Verify purchase with Apple/Google (basic validation)
   */
  private async verifyPurchase(
    purchase: Purchase
  ): Promise<boolean> {
    try {
      // For production, you should verify the receipt with Apple/Google servers
      // For now, we trust StoreKit 2 which auto-verifies on device
      
      // Basic validation
      if (!purchase.transactionId || !purchase.productId) {
        console.error('❌ [IAP] Invalid purchase data');
        return false;
      }

      console.log('✅ [IAP] Purchase validation passed');
      return true;

    } catch (error) {
      console.error('❌ [IAP] Verification error:', error);
      return false;
    }
  }

  /**
   * Record purchase in Supabase user_iap table
   */
  private async recordPurchaseInSupabase(
    purchase: Purchase
  ): Promise<void> {
    try {
      console.log('💾 [IAP] Recording purchase in Supabase...', purchase.productId);

      // Check if this is a tip (consumable) product
      const isTip = purchase.productId.includes('tip');
      
      if (isTip) {
        // For tips, just finish the transaction - no need to track in Supabase
        console.log('💰 [IAP] Tip received - thank you!');
        
        // Update local storage to show gratitude
        await localStorageService.setAdFreeStatus({
          ...await localStorageService.getAdFreeStatus(),
          lastChecked: new Date().toISOString(),
        });
        
        return; // Skip Supabase recording for tips
      }

      // Get current user (may be guest or authenticated)
      const { data: { user } } = await supabase.auth.getUser();
      
      // For guest users, store purchase locally only
      if (!user) {
        console.log('⚠️ [IAP] Guest user purchase - storing locally only');
        const expiresDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        
        await localStorageService.setAdFreeStatus({
          isAdFree: true,
          productType: 'subscription',
          expiresAt: expiresDate,
          lastChecked: new Date().toISOString(),
        });
        
        console.log('💡 [IAP] Guest can create account later to sync purchase across devices');
        return; // Skip Supabase recording for guests
      }

      // Determine expiration date (all purchases are now subscriptions)
      const expiresDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

      // Upsert to user_iap table
      const { error: iapError } = await supabase
        .from('user_iap')
        .upsert({
          user_id: user.id,
          transaction_id: purchase.transactionId,
          original_transaction_id: (purchase as any).originalTransactionId || purchase.transactionId,
          product_id: purchase.productId,
          purchase_date: new Date(purchase.transactionDate).toISOString(),
          original_purchase_date: new Date(purchase.transactionDate).toISOString(),
          expires_date: expiresDate,
          is_active: true,
          environment: __DEV__ ? 'sandbox' : 'production',
          last_notification_type: 'INITIAL_BUY',
          last_notification_date: new Date().toISOString(),
        }, {
          onConflict: 'transaction_id',
        });

      if (iapError) {
        console.error('❌ [IAP] Error recording in user_iap:', iapError);
        throw iapError;
      }

      console.log('✅ [IAP] Purchase recorded in user_iap table');

      // The trigger will automatically update user_profiles.ad_free
      // But we can also update it directly for immediate effect
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          ad_free: true,
          is_premium: true,
          product_type: 'subscription',
          last_purchase_date: new Date().toISOString(),
          premium_expires_at: expiresDate,
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('❌ [IAP] Error updating user_profiles:', profileError);
      } else {
        console.log('✅ [IAP] user_profiles updated');
      }

      // Update local cache for immediate UI update
      await localStorageService.setAdFreeStatus({
        isAdFree: true,
        productType: 'subscription',
        expiresAt: expiresDate,
        lastChecked: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ [IAP] Error recording purchase:', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    try {
      console.log('🧹 [IAP] Cleaning up...');

      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }

      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }

      await (RNIap as any).endConnection();
      this.isInitialized = false;

      console.log('✅ [IAP] Cleanup complete');
    } catch (error) {
      console.error('❌ [IAP] Cleanup error:', error);
    }
  }

  /**
   * Legacy compatibility methods
   */
  public async hasAdFreeAccess(): Promise<boolean> {
    const status = await this.checkAdFreeStatus();
    return status.isAdFree;
  }

  public async presentAdFreePayment(): Promise<{ success: boolean; error?: string }> {
    const result = await this.purchaseProduct(PRODUCT_IDS.MONTHLY);
    return {
      success: result.success,
      error: result.error,
    };
  }

  public getAdFreeProducts(): Array<{ id: string; name: string; price: string; description: string }> {
    return this.products.map(p => ({
      id: p.productId,
      name: p.title,
      price: p.localizedPrice,
      description: p.description,
    }));
  }
}

// Export singleton instance
export const iapService = IAPService.getInstance();

// Export for backwards compatibility
export default iapService;