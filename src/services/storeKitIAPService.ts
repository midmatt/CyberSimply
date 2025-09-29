import { Platform, Alert } from 'react-native';
import { supabase } from './supabaseClientProduction';
import { finishTransaction } from 'react-native-iap';
import { localStorageService } from './localStorageService';

// Safely import react-native-iap with fallback
let RNIAP: any = null;
let Purchase: any = null;

try {
  RNIAP = require('react-native-iap');
  // Try to get types if available
  try {
    const types = require('react-native-iap');
    Purchase = types.Purchase || types.default?.Purchase;
  } catch (e) {
    // Fallback type
    Purchase = Object;
  }
} catch (error) {
  console.warn('⚠️ react-native-iap not available, using fallback mode');
  RNIAP = {
    initConnection: () => Promise.resolve(false),
    endConnection: () => Promise.resolve(false),
    getProducts: () => Promise.resolve([]),
    getSubscriptions: () => Promise.resolve([]),
    requestPurchase: () => Promise.resolve(null),
    requestSubscription: () => Promise.resolve(null),
    getAvailablePurchases: () => Promise.resolve([]),
    finishTransaction: () => Promise.resolve(false),
    purchaseUpdatedListener: () => ({ remove: () => {} }),
    purchaseErrorListener: () => ({ remove: () => {} }),
  };
  Purchase = Object;
}

// Product IDs
export const PRODUCT_IDS = {
  LIFETIME: 'com.cybersimply.adfree.lifetime.2025',
  MONTHLY: 'com.cybersimply.adfree.monthly.2025',
} as const;

export interface AdFreeProduct {
  productId: string;
  price: string;
  currency: string;
  title: string;
  description: string;
  localizedPrice: string;
  type: 'lifetime' | 'subscription';
}

export interface PurchaseResult {
  success: boolean;
  purchase?: any;
  error?: string;
}

export interface AdFreeStatus {
  isAdFree: boolean;
  productType?: 'lifetime' | 'subscription';
  expiresAt?: string;
}

export class StoreKitIAPService {
  private static instance: StoreKitIAPService;
  private isInitialized: boolean = false;
  private products: AdFreeProduct[] = [];
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  private constructor() {}

  public static getInstance(): StoreKitIAPService {
    if (!StoreKitIAPService.instance) {
      StoreKitIAPService.instance = new StoreKitIAPService();
    }
    return StoreKitIAPService.instance;
  }

  /**
   * Initialize the StoreKit IAP service
   */
  public async initialize(): Promise<{ success: boolean; error?: string }> {
    if (this.isInitialized) {
      console.log('🛒 [StoreKit] Already initialized');
      return { success: true };
    }

    try {
      console.log('🛒 [StoreKit] Starting initialization...');

      // Check if RNIAP is available
      if (!RNIAP) {
        console.warn('⚠️ [StoreKit] react-native-iap not available, using fallback mode');
        this.isInitialized = true;
        return { success: true };
      }

      // Step 1: Initialize connection
      console.log('🛒 [StoreKit] Step 1: Initializing connection...');
      const initPromise = RNIAP.initConnection();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('IAP connection timeout')), 5000)
      );
      
      const connectionResult = await Promise.race([initPromise, timeoutPromise]);
      console.log('✅ [StoreKit] Connection initialized:', connectionResult);

      // Step 2: Set up purchase listeners
      console.log('🛒 [StoreKit] Step 2: Setting up purchase listeners...');
      this.setupPurchaseListeners();

      // Step 3: Fetch products
      console.log('🛒 [StoreKit] Step 3: Fetching products...');
      const fetchPromise = this.fetchProducts();
      const fetchTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Product fetch timeout')), 3000)
      );
      
      await Promise.race([fetchPromise, fetchTimeoutPromise]);

      this.isInitialized = true;
      console.log('✅ [StoreKit] Initialization completed successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ [StoreKit] Initialization failed:', error);
      this.isInitialized = false;
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to initialize IAP service' 
      };
    }
  }

  /**
   * Set up purchase listeners
   */
  private setupPurchaseListeners(): void {
    if (!RNIAP) {
      console.warn('⚠️ StoreKit IAP: Cannot setup listeners, RNIAP not available');
      return;
    }

    try {
      // Purchase update listener
      this.purchaseUpdateSubscription = RNIAP.purchaseUpdatedListener(
        async (purchase: any) => {
          console.log('🛒 StoreKit IAP: Purchase updated:', purchase);
          
          try {
            // Finish the transaction
            await finishTransaction({ purchase, isConsumable: false });
            
            // Update ad-free status
            await this.updateAdFreeStatus(purchase);
            
            console.log('✅ StoreKit IAP: Purchase processed successfully');
          } catch (error) {
            console.error('❌ StoreKit IAP: Error processing purchase:', error);
          }
        }
      );

      // Purchase error listener
      this.purchaseErrorSubscription = RNIAP.purchaseErrorListener(
        (error: any) => {
          console.error('❌ StoreKit IAP: Purchase error:', error);
        }
      );
    } catch (error) {
      console.error('❌ StoreKit IAP: Error setting up listeners:', error);
    }
  }

  /**
   * Fetch available products from the App Store
   */
  private async fetchProducts(): Promise<void> {
    try {
      const productIds = [PRODUCT_IDS.LIFETIME, PRODUCT_IDS.MONTHLY];
      const products = await RNIAP.getProducts({ skus: productIds });
      
      console.log('🛒 StoreKit IAP: Fetched products:', products);

      this.products = products.map((product: any) => ({
        productId: product.productId,
        price: product.price,
        currency: product.currency,
        title: product.title,
        description: product.description,
        localizedPrice: product.price,
        type: product.productId === PRODUCT_IDS.LIFETIME ? 'lifetime' : 'subscription',
      }));

      console.log(`✅ StoreKit IAP: Found ${this.products.length} products`);
    } catch (error) {
      console.error('❌ StoreKit IAP: Error fetching products:', error);
      // Set fallback products
      this.products = this.getFallbackProducts();
    }
  }

  /**
   * Get fallback products when StoreKit is not available
   */
  private getFallbackProducts(): AdFreeProduct[] {
    return [
      {
        productId: PRODUCT_IDS.LIFETIME,
        price: '12.99',
        currency: 'USD',
        title: 'Ad-Free Lifetime',
        description: 'Remove all ads forever and support the development of CyberSimply.',
        localizedPrice: '$12.99',
        type: 'lifetime',
      },
      {
        productId: PRODUCT_IDS.MONTHLY,
        price: '2.99',
        currency: 'USD',
        title: 'Ad-Free Monthly',
        description: 'Remove all ads with monthly subscription.',
        localizedPrice: '$2.99',
        type: 'subscription',
      },
    ];
  }

  /**
   * Get available products
   */
  public getProducts(): AdFreeProduct[] {
    return [...this.products];
  }

  /**
   * Get a specific product by ID
   */
  public getProduct(productId: string): AdFreeProduct | undefined {
    return this.products.find(product => product.productId === productId);
  }

  /**
   * Purchase a product
   */
  public async purchaseProduct(productId: string): Promise<PurchaseResult> {
    if (!this.isInitialized) {
      return { success: false, error: 'IAP service not initialized' };
    }

    try {
      console.log(`🛒 StoreKit IAP: Purchasing ${productId}...`);

      const product = this.getProduct(productId);
      if (!product) {
        return { success: false, error: 'Product not found' };
      }

      // CRITICAL: Check if user already owns this product before allowing purchase
      console.log(`🛒 StoreKit IAP: Checking if user already owns ${productId}...`);
      const currentStatus = await this.checkAdFreeStatus();
      
      // For lifetime purchases, check if user already has ad-free access
      if (product.type === 'lifetime' && currentStatus.isAdFree) {
        console.log('❌ StoreKit IAP: User already has ad-free access, preventing duplicate purchase');
        return { 
          success: false, 
          error: 'You already have ad-free access. Use "Restore Purchases" if you need to restore your purchase.' 
        };
      }

      // For monthly subscriptions, check if user already has an active subscription
      if (product.type === 'subscription' && currentStatus.isAdFree && currentStatus.productType === 'subscription') {
        console.log('❌ StoreKit IAP: User already has an active subscription, preventing duplicate purchase');
        return { 
          success: false, 
          error: 'You already have an active ad-free subscription. Use "Restore Purchases" if you need to restore your subscription.' 
        };
      }

      // If user has lifetime access, don't allow monthly subscription
      if (product.type === 'subscription' && currentStatus.isAdFree && currentStatus.productType === 'lifetime') {
        console.log('❌ StoreKit IAP: User has lifetime access, monthly subscription not needed');
        return { 
          success: false, 
          error: 'You already have lifetime ad-free access. No subscription needed.' 
        };
      }

      console.log(`✅ StoreKit IAP: Purchase validation passed, proceeding with ${productId}...`);

      let purchase: any;

      if (product.type === 'subscription') {
        // Handle subscription purchase
        purchase = await RNIAP.requestSubscription({ sku: productId });
      } else {
        // Handle one-time purchase
        purchase = await RNIAP.requestPurchase({ sku: productId });
      }

      console.log('✅ StoreKit IAP: Purchase successful:', purchase);
      return { success: true, purchase };

    } catch (error) {
      console.error('❌ StoreKit IAP: Purchase failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Purchase failed' 
      };
    }
  }

  /**
   * Restore purchases
   */
  public async restorePurchases(): Promise<{ success: boolean; restoredPurchases?: any[]; error?: string }> {
    console.log('🛒 [StoreKit] Restore purchases requested...');

    // Ensure service is initialized first
    if (!this.isInitialized) {
      console.log('🛒 [StoreKit] Service not initialized, initializing now...');
      const initResult = await this.initialize();
      if (!initResult.success) {
        console.error('❌ [StoreKit] Failed to initialize before restore:', initResult.error);
        return { success: false, error: `Initialization failed: ${initResult.error}` };
      }
    }

    try {
      console.log('🛒 [StoreKit] Querying available purchases...');

      // Check if RNIAP is available
      if (!RNIAP) {
        console.warn('⚠️ [StoreKit] react-native-iap not available, no purchases to restore');
        return { success: true, restoredPurchases: [] };
      }

      const purchases = await RNIAP.getAvailablePurchases();
      console.log('✅ [StoreKit] Found purchases:', purchases?.length || 0);

      if (!purchases || purchases.length === 0) {
        console.log('ℹ️ [StoreKit] No purchases found to restore');
        return { success: true, restoredPurchases: [] };
      }

      // Filter for our ad-free products
      const adFreePurchases = purchases.filter(purchase => 
        purchase.productId === PRODUCT_IDS.LIFETIME || 
        purchase.productId === PRODUCT_IDS.MONTHLY
      );

      console.log('✅ [StoreKit] Found ad-free purchases:', adFreePurchases.length);

      if (adFreePurchases.length === 0) {
        console.log('ℹ️ [StoreKit] No ad-free purchases found');
        return { success: true, restoredPurchases: [] };
      }

      // Process each restored purchase
      for (const purchase of adFreePurchases) {
        console.log('🛒 [StoreKit] Processing restored purchase:', purchase.productId);
        await this.updateAdFreeStatus(purchase);
      }

      console.log('✅ [StoreKit] Restore purchases completed successfully');
      return { success: true, restoredPurchases: adFreePurchases };

    } catch (error) {
      console.error('❌ [StoreKit] Restore purchases failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to restore purchases' 
      };
    }
  }

  /**
   * Check ad-free status
   */
  public async checkAdFreeStatus(): Promise<AdFreeStatus> {
    try {
      console.log('🛒 [StoreKit] Checking ad-free status...');

      // First check Supabase for stored status (only if verified purchase)
      const supabaseStatus = await this.getSupabaseAdFreeStatus();
      if (supabaseStatus.isAdFree) {
        console.log('✅ [StoreKit] Ad-free status found in Supabase (verified purchase)');
        return supabaseStatus;
      }

      // If not found in Supabase, check local purchases
      console.log('🛒 [StoreKit] No verified purchase in Supabase, checking local purchases...');
      
      if (!RNIAP) {
        console.warn('⚠️ [StoreKit] react-native-iap not available, cannot check purchases');
        return { isAdFree: false };
      }

      const purchases = await RNIAP.getAvailablePurchases();
      console.log('🛒 [StoreKit] Found local purchases:', purchases?.length || 0);

      const adFreePurchase = purchases?.find(purchase => 
        purchase.productId === PRODUCT_IDS.LIFETIME || 
        purchase.productId === PRODUCT_IDS.MONTHLY
      );

      if (adFreePurchase) {
        console.log('✅ [StoreKit] Found ad-free purchase, updating Supabase...');
        await this.updateAdFreeStatus(adFreePurchase);
        return {
          isAdFree: true,
          productType: adFreePurchase.productId === PRODUCT_IDS.LIFETIME ? 'lifetime' : 'subscription',
        };
      }

      console.log('❌ [StoreKit] No ad-free purchases found');
      return { isAdFree: false };

    } catch (error) {
      console.error('❌ [StoreKit] Error checking ad-free status:', error);
      return { isAdFree: false };
    }
  }

  /**
   * Update ad-free status in Supabase
   */
  private async updateAdFreeStatus(purchase: any): Promise<void> {
    try {
      console.log('🛒 [StoreKit] Updating ad-free status for purchase:', purchase.productId);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ [StoreKit] No authenticated user for ad-free status update');
        return;
      }

      console.log('🛒 [StoreKit] Updating profile for user:', user.id);

      const isLifetime = purchase.productId === PRODUCT_IDS.LIFETIME;
      const expiresAt = isLifetime ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days for subscription

      console.log('🛒 [StoreKit] Purchase details:', {
        productId: purchase.productId,
        isLifetime,
        expiresAt,
        transactionId: purchase.transactionId,
        userId: user.id
      });

      // Update Supabase with ad_free = true
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_premium: true,
          premium_expires_at: expiresAt,
          ad_free: true, // Set ad_free to true for any purchase
          last_purchase_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('❌ [StoreKit] Error updating ad-free status in Supabase:', error);
        throw error;
      }

      console.log('✅ [StoreKit] Ad-free status updated in Supabase successfully');

      // Also update local storage immediately to prevent flicker
      const adFreeStatus = {
        isAdFree: true,
        productType: (isLifetime ? 'lifetime' : 'subscription') as 'lifetime' | 'subscription',
        expiresAt: expiresAt || undefined,
        lastChecked: new Date().toISOString(),
      };

      await localStorageService.setAdFreeStatus(adFreeStatus);
      await localStorageService.setLastSync();
      
      console.log('✅ [StoreKit] Ad-free status also stored locally for immediate UI update');

    } catch (error) {
      console.error('❌ [StoreKit] Error updating ad-free status:', error);
      throw error;
    }
  }

  /**
   * Get ad-free status from Supabase
   */
  private async getSupabaseAdFreeStatus(): Promise<AdFreeStatus> {
    try {
      console.log('🛒 [StoreKit] Checking Supabase ad-free status...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ [StoreKit] No authenticated user');
        return { isAdFree: false };
      }

      console.log('🛒 [StoreKit] Querying profile for user:', user.id);

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('is_premium, premium_expires_at, ad_free')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ [StoreKit] Error querying profile:', error);
        return { isAdFree: false };
      }

      if (!profile) {
        console.log('⚠️ [StoreKit] No profile found for user');
        return { isAdFree: false };
      }

      console.log('🛒 [StoreKit] Profile data:', {
        is_premium: profile.is_premium,
        ad_free: profile.ad_free,
        premium_expires_at: profile.premium_expires_at
      });

      // Check ad_free column first (only set after verified purchase)
      if (profile.ad_free) {
        console.log('✅ [StoreKit] User has verified ad-free access');
        return {
          isAdFree: true,
          productType: 'lifetime', // ad_free is always lifetime
        };
      }

      // Check is_premium as fallback (legacy)
      if (!profile.is_premium) {
        console.log('❌ [StoreKit] User does not have premium access');
        return { isAdFree: false };
      }

      // Check if subscription has expired
      if (profile.premium_expires_at) {
        const expiresAt = new Date(profile.premium_expires_at);
        const now = new Date();
        
        if (expiresAt <= now) {
          console.log('❌ [StoreKit] Premium subscription has expired');
          return { isAdFree: false };
        }

        console.log('✅ [StoreKit] User has active premium subscription');
        return {
          isAdFree: true,
          productType: 'subscription',
          expiresAt: profile.premium_expires_at,
        };
      }

      // Lifetime purchase (legacy)
      console.log('✅ [StoreKit] User has lifetime premium access');
      return {
        isAdFree: true,
        productType: 'lifetime',
      };

    } catch (error) {
      console.error('❌ [StoreKit] Error getting Supabase ad-free status:', error);
      return { isAdFree: false };
    }
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    try {
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }

      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }

      await RNIAP.endConnection();
      this.isInitialized = false;
      console.log('✅ StoreKit IAP: Cleaned up successfully');
    } catch (error) {
      console.error('❌ StoreKit IAP: Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export const storeKitIAPService = StoreKitIAPService.getInstance();
