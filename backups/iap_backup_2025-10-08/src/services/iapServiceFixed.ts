import { Platform } from 'react-native';
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safely import expo-in-app-purchases with fallback
let InAppPurchases: any = null;
let IAPQueryResponse: any = null;
let IAPItemDetails: any = null;
let InAppPurchase: any = null;

try {
  InAppPurchases = require('expo-in-app-purchases');
  IAPQueryResponse = InAppPurchases.IAPQueryResponse;
  IAPItemDetails = InAppPurchases.IAPItemDetails;
  InAppPurchase = InAppPurchases.InAppPurchase;
} catch (error) {
  console.warn('⚠️ expo-in-app-purchases not available, using fallback mode');
}

export interface IAPProduct {
  productId: string;
  price: string;
  currency: string;
  title: string;
  description: string;
  localizedPrice: string;
}

export interface IAPPurchase {
  productId: string;
  transactionId: string;
  transactionDate: number;
  transactionReceipt: string;
}

export interface IAPStatus {
  isAdFree: boolean;
  productType?: 'lifetime' | 'subscription';
  expiresAt?: string;
  lastChecked?: string;
}

export interface AppleReceiptResponse {
  status: number;
  environment: string;
  receipt: {
    receipt_type: string;
    bundle_id: string;
    application_version: string;
    in_app: Array<{
      quantity: string;
      product_id: string;
      transaction_id: string;
      original_transaction_id: string;
      purchase_date: string;
      purchase_date_ms: string;
      expires_date: string;
      expires_date_ms: string;
      is_trial_period: string;
      is_in_intro_offer_period: string;
    }>;
  };
  latest_receipt_info?: Array<{
    quantity: string;
    product_id: string;
    transaction_id: string;
    original_transaction_id: string;
    purchase_date: string;
    purchase_date_ms: string;
    expires_date: string;
    expires_date_ms: string;
    is_trial_period: string;
    is_in_intro_offer_period: string;
  }>;
}

export class IAPServiceFixed {
  private static instance: IAPServiceFixed;
  private isInitialized: boolean = false;
  private products: IAPProduct[] = [];
  private purchaseListeners: any[] = [];

  // Apple App Store verification endpoints
  private readonly APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';
  private readonly APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
  
  // Your app's shared secret (get this from App Store Connect)
  private readonly APPLE_SHARED_SECRET = process.env.EXPO_PUBLIC_APPLE_SHARED_SECRET || '';

  private constructor() {}

  public static getInstance(): IAPServiceFixed {
    if (!IAPServiceFixed.instance) {
      IAPServiceFixed.instance = new IAPServiceFixed();
    }
    return IAPServiceFixed.instance;
  }

  /**
   * Initialize the IAP service
   */
  public async initialize(): Promise<{ success: boolean; error?: string }> {
    if (this.isInitialized) {
      console.log('🛒 IAP Service: Already initialized');
      return { success: true };
    }

    try {
      console.log('🛒 IAP Service: Initializing...');

      if (!InAppPurchases) {
        console.warn('⚠️ IAP Service: expo-in-app-purchases not available, using fallback mode');
        this.isInitialized = true;
        this.products = this.getFallbackProducts();
        return { success: true };
      }

      // Connect to the store
      await InAppPurchases.connectAsync();
      console.log('✅ IAP Service: Connected to store');

      // Set up purchase listeners
      this.setupPurchaseListeners();

      // Get available products
      const productIds = [
        'com.cybersimply.adfree.lifetime',
        'com.cybersimply.adfree.monthly',
        'com.cybersimply.premium.monthly'
      ];

      const response: any = await InAppPurchases.getProductsAsync(productIds);
      
      if (response.responseCode === InAppPurchases.IAPResponseCode.OK && response.results) {
        this.products = response.results.map((product: any) => ({
          productId: product.productId,
          price: product.price,
          currency: product.priceCurrencyCode,
          title: product.title,
          description: product.description,
          localizedPrice: product.price,
        }));
      } else {
        console.warn('Failed to get products:', response.errorCode);
        this.products = this.getFallbackProducts();
      }

      console.log(`✅ IAP Service: Found ${this.products.length} products`);
      this.isInitialized = true;
      return { success: true };

    } catch (error) {
      console.error('❌ IAP Service: Initialization failed:', error);
      this.isInitialized = true;
      this.products = this.getFallbackProducts();
      return { success: true };
    }
  }

  /**
   * Set up purchase listeners
   */
  private setupPurchaseListeners(): void {
    if (!InAppPurchases) return;

    try {
      // Purchase updated listener
      const purchaseUpdateListener = InAppPurchases.addPurchaseUpdatedListener(async (purchase: any) => {
        console.log('🛒 IAP Service: Purchase updated:', purchase);
        await this.handlePurchaseUpdate(purchase);
      });

      // Purchase error listener
      const purchaseErrorListener = InAppPurchases.addPurchaseErrorListener((error: any) => {
        console.error('❌ IAP Service: Purchase error:', error);
      });

      this.purchaseListeners.push(purchaseUpdateListener, purchaseErrorListener);
    } catch (error) {
      console.error('❌ IAP Service: Error setting up listeners:', error);
    }
  }

  /**
   * Handle purchase updates
   */
  private async handlePurchaseUpdate(purchase: any): Promise<void> {
    try {
      console.log('🛒 IAP Service: Processing purchase update:', purchase);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ IAP Service: No authenticated user for purchase update');
        return;
      }

      // Verify receipt with Apple
      const isVerified = await this.verifyReceiptWithApple(purchase.transactionReceipt);
      if (!isVerified) {
        console.error('❌ IAP Service: Receipt verification failed');
        return;
      }

      // Save to Supabase
      await this.saveIAPToSupabase(user.id, purchase);

      // Update user ad-free status
      await this.updateUserAdFreeStatus(user.id);

      // Finish the transaction
      await InAppPurchases.finishTransactionAsync(purchase, false);

      console.log('✅ IAP Service: Purchase processed successfully');

    } catch (error) {
      console.error('❌ IAP Service: Error handling purchase update:', error);
    }
  }

  /**
   * Verify receipt with Apple
   */
  public async verifyReceiptWithApple(receiptData: string): Promise<boolean> {
    try {
      console.log('🍎 IAP Service: Verifying receipt with Apple...');

      const isProduction = !__DEV__;
      const endpoint = isProduction ? this.APPLE_PRODUCTION_URL : this.APPLE_SANDBOX_URL;

      const requestBody = {
        'receipt-data': receiptData,
        'password': this.APPLE_SHARED_SECRET,
        'exclude-old-transactions': true,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error('❌ IAP Service: Apple verification request failed:', response.status);
        return false;
      }

      const result: AppleReceiptResponse = await response.json();
      console.log('🍎 IAP Service: Apple verification response:', result.status);

      // Check if verification was successful
      if (result.status === 0) {
        // Check if we have valid in-app purchases
        const inAppPurchases = result.latest_receipt_info || result.receipt.in_app || [];
        
        // Check if any of our products are valid and not expired
        const validPurchases = inAppPurchases.filter(purchase => {
          const productId = purchase.product_id;
          const expiresDate = purchase.expires_date_ms;
          
          // Check if it's one of our products
          const isOurProduct = [
            'com.cybersimply.adfree.lifetime',
            'com.cybersimply.adfree.monthly',
            'com.cybersimply.premium.monthly'
          ].includes(productId);

          if (!isOurProduct) return false;

          // For lifetime purchases, expires_date_ms is 0
          if (expiresDate === '0') return true;

          // For subscriptions, check if not expired
          const expirationDate = new Date(parseInt(expiresDate));
          return expirationDate > new Date();
        });

        console.log('✅ IAP Service: Receipt verified, valid purchases:', validPurchases.length);
        return validPurchases.length > 0;
      } else {
        console.error('❌ IAP Service: Apple verification failed with status:', result.status);
        return false;
      }

    } catch (error) {
      console.error('❌ IAP Service: Error verifying receipt:', error);
      return false;
    }
  }

  /**
   * Save IAP status to Supabase
   */
  public async saveIAPToSupabase(userId: string, purchaseData: any): Promise<void> {
    try {
      console.log('💾 IAP Service: Saving IAP to Supabase...');

      const productId = purchaseData.productId;
      const transactionId = purchaseData.transactionId || purchaseData.orderId;
      const purchaseDate = new Date(purchaseData.purchaseTime || Date.now());
      
      // Calculate expiration date based on product type
      let expirationDate: Date | null = null;
      if (productId.includes('monthly')) {
        expirationDate = new Date(purchaseDate);
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      }

      const iapData = {
        user_id: userId,
        product_id: productId,
        transaction_id: transactionId,
        purchase_date: purchaseDate.toISOString(),
        expiration_date: expirationDate?.toISOString() || null,
        is_active: true,
        receipt_data: purchaseData.transactionReceipt || '',
        apple_verification_status: 'verified',
        last_verified_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_iap_status')
        .upsert(iapData, {
          onConflict: 'user_id,product_id,is_active'
        });

      if (error) {
        console.error('❌ IAP Service: Error saving to Supabase:', error);
        throw error;
      }

      console.log('✅ IAP Service: IAP status saved to Supabase');

    } catch (error) {
      console.error('❌ IAP Service: Error saving IAP to Supabase:', error);
      throw error;
    }
  }

  /**
   * Restore IAP from Supabase
   */
  public async restoreIAPFromSupabase(userId: string): Promise<IAPStatus> {
    try {
      console.log('🔄 IAP Service: Restoring IAP from Supabase...');

      const { data, error } = await supabase
        .from('user_iap_status')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .in('product_id', [
          'com.cybersimply.adfree.lifetime',
          'com.cybersimply.adfree.monthly',
          'com.cybersimply.premium.monthly'
        ]);

      if (error) {
        console.error('❌ IAP Service: Error fetching from Supabase:', error);
        return { isAdFree: false };
      }

      if (!data || data.length === 0) {
        console.log('ℹ️ IAP Service: No active IAP found in Supabase');
        return { isAdFree: false };
      }

      // Check if any purchase is still valid
      const now = new Date();
      const validPurchase = data.find(purchase => {
        if (!purchase.expiration_date) return true; // Lifetime purchase
        return new Date(purchase.expiration_date) > now;
      });

      if (validPurchase) {
        console.log('✅ IAP Service: Valid IAP found in Supabase');
        return {
          isAdFree: true,
          productType: validPurchase.product_id.includes('lifetime') ? 'lifetime' : 'subscription',
          expiresAt: validPurchase.expiration_date,
          lastChecked: new Date().toISOString(),
        };
      }

      console.log('ℹ️ IAP Service: No valid IAP found in Supabase');
      return { isAdFree: false };

    } catch (error) {
      console.error('❌ IAP Service: Error restoring from Supabase:', error);
      return { isAdFree: false };
    }
  }

  /**
   * Update user ad-free status in Supabase
   */
  private async updateUserAdFreeStatus(userId: string): Promise<void> {
    try {
      console.log('🔄 IAP Service: Updating user ad-free status...');

      const { error } = await supabase.rpc('update_user_ad_free_status', {
        user_uuid: userId
      });

      if (error) {
        console.error('❌ IAP Service: Error updating ad-free status:', error);
      } else {
        console.log('✅ IAP Service: User ad-free status updated');
      }

    } catch (error) {
      console.error('❌ IAP Service: Error updating ad-free status:', error);
    }
  }

  /**
   * Clear IAP on logout
   */
  public async clearIAPOnLogout(): Promise<void> {
    try {
      console.log('🧹 IAP Service: Clearing IAP on logout...');

      // Clear local storage
      await AsyncStorage.removeItem('adFree');
      await AsyncStorage.removeItem('iapStatus');
      await AsyncStorage.removeItem('lastIAPCheck');

      // Remove purchase listeners
      this.purchaseListeners.forEach(listener => {
        if (listener && typeof listener.remove === 'function') {
          listener.remove();
        }
      });
      this.purchaseListeners = [];

      console.log('✅ IAP Service: IAP cleared on logout');

    } catch (error) {
      console.error('❌ IAP Service: Error clearing IAP:', error);
    }
  }

  /**
   * Sync IAP on login
   */
  public async syncIAPOnLogin(userId: string): Promise<IAPStatus> {
    try {
      console.log('🔄 IAP Service: Syncing IAP on login...');

      // First check Supabase
      const supabaseStatus = await this.restoreIAPFromSupabase(userId);
      if (supabaseStatus.isAdFree) {
        console.log('✅ IAP Service: Valid IAP found in Supabase');
        return supabaseStatus;
      }

      // If not found in Supabase, check local purchase history
      if (!InAppPurchases) {
        console.warn('⚠️ IAP Service: expo-in-app-purchases not available');
        return { isAdFree: false };
      }

      const history = await InAppPurchases.getPurchaseHistoryAsync();
      if (history.responseCode === InAppPurchases.IAPResponseCode.OK && history.results) {
        console.log('🔄 IAP Service: Checking local purchase history...');

        for (const purchase of history.results) {
          const productId = purchase.productId;
          if (['com.cybersimply.adfree.lifetime', 'com.cybersimply.adfree.monthly', 'com.cybersimply.premium.monthly'].includes(productId)) {
            // Verify with Apple
            const isVerified = await this.verifyReceiptWithApple(purchase.transactionReceipt);
            if (isVerified) {
              // Save to Supabase
              await this.saveIAPToSupabase(userId, purchase);
              await this.updateUserAdFreeStatus(userId);
              
              return {
                isAdFree: true,
                productType: productId.includes('lifetime') ? 'lifetime' : 'subscription',
                lastChecked: new Date().toISOString(),
              };
            }
          }
        }
      }

      console.log('ℹ️ IAP Service: No valid IAP found');
      return { isAdFree: false };

    } catch (error) {
      console.error('❌ IAP Service: Error syncing IAP:', error);
      return { isAdFree: false };
    }
  }

  /**
   * Purchase a product
   */
  public async purchaseProduct(productId: string): Promise<{ success: boolean; purchase?: IAPPurchase; error?: string }> {
    if (!this.isInitialized) {
      return { success: false, error: 'IAP service not initialized' };
    }

    try {
      console.log(`🛒 IAP Service: Purchasing ${productId}...`);

      if (!InAppPurchases) {
        return { success: false, error: 'IAP not available' };
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if user already has this product
      const currentStatus = await this.restoreIAPFromSupabase(user.id);
      if (currentStatus.isAdFree) {
        return { success: false, error: 'You already have ad-free access' };
      }

      // Request purchase
      const purchase = await InAppPurchases.requestPurchaseAsync({ sku: productId });
      
      if (purchase) {
        console.log('✅ IAP Service: Purchase successful');
        return { 
          success: true, 
          purchase: {
            productId: purchase.productId,
            transactionId: purchase.transactionId || purchase.orderId,
            transactionDate: purchase.purchaseTime,
            transactionReceipt: purchase.transactionReceipt,
          }
        };
      } else {
        return { success: false, error: 'Purchase was cancelled' };
      }

    } catch (error) {
      console.error('❌ IAP Service: Purchase failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Purchase failed' 
      };
    }
  }

  /**
   * Restore purchases
   */
  public async restorePurchases(): Promise<{ success: boolean; purchases?: IAPPurchase[]; error?: string }> {
    try {
      console.log('🔄 IAP Service: Restoring purchases...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Sync IAP on login (this handles both Supabase and local restoration)
      const status = await this.syncIAPOnLogin(user.id);
      
      if (status.isAdFree) {
        return { success: true, purchases: [] };
      } else {
        return { success: true, purchases: [] };
      }

    } catch (error) {
      console.error('❌ IAP Service: Restore failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Restore failed' 
      };
    }
  }

  /**
   * Check ad-free status
   */
  public async checkAdFreeStatus(): Promise<IAPStatus> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { isAdFree: false };
      }

      return await this.restoreIAPFromSupabase(user.id);

    } catch (error) {
      console.error('❌ IAP Service: Error checking ad-free status:', error);
      return { isAdFree: false };
    }
  }

  /**
   * Get available products
   */
  public getProducts(): IAPProduct[] {
    return [...this.products];
  }

  /**
   * Get fallback products
   */
  private getFallbackProducts(): IAPProduct[] {
    return [
      {
        productId: 'com.cybersimply.adfree.lifetime',
        price: '9.99',
        currency: 'USD',
        title: 'Ad-Free Lifetime',
        description: 'Remove all ads forever and support the development of CyberSimply.',
        localizedPrice: '$9.99'
      }
    ];
  }

  /**
   * Disconnect from the store
   */
  public async disconnect(): Promise<void> {
    try {
      if (InAppPurchases) {
        await InAppPurchases.disconnectAsync();
        console.log('✅ IAP Service: Disconnected from store');
      }
      
      // Remove listeners
      this.purchaseListeners.forEach(listener => {
        if (listener && typeof listener.remove === 'function') {
          listener.remove();
        }
      });
      this.purchaseListeners = [];
      
      this.isInitialized = false;
    } catch (error) {
      console.error('❌ IAP Service: Error disconnecting:', error);
    }
  }
}

// Export singleton instance
export const iapServiceFixed = IAPServiceFixed.getInstance();
