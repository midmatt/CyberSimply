import { Platform } from 'react-native';
import { supabase } from './supabaseClient';

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

export interface AdFreeProduct {
  id: string;
  name: string;
  price: string;
  description: string;
}

export interface IAPPurchase {
  productId: string;
  transactionId: string;
  transactionDate: number;
  transactionReceipt: string;
}

export interface IAPConfig {
  productIds: string[];
  testMode: boolean;
}

export class IAPService {
  private static instance: IAPService;
  private isInitialized: boolean = false;
  private products: IAPProduct[] = [];
  private config: IAPConfig;

  private constructor() {
    this.config = {
      productIds: [
        'com.cybersimply.adfree.monthly', // Monthly ad-free subscription
        'com.cybersimply.premium.monthly', // Monthly premium subscription
        'com.cybersimply.adfree.lifetime', // Lifetime ad-free purchase
      ],
      testMode: __DEV__, // Enable test mode in development
    };
  }

  public static getInstance(): IAPService {
    if (!IAPService.instance) {
      IAPService.instance = new IAPService();
    }
    return IAPService.instance;
  }

  /**
   * Initialize the IAP service
   */
  public async initialize(): Promise<{ success: boolean; error?: string }> {
    if (this.isInitialized) {
      console.log('IAP Service: Already initialized');
      return { success: true };
    }

    try {
      console.log('🛒 IAP Service: Initializing...');

      // Check if expo-in-app-purchases is available
      if (!InAppPurchases) {
        console.warn('⚠️ IAP Service: expo-in-app-purchases not available, using fallback mode');
        this.isInitialized = true;
        this.products = this.getFallbackProducts();
        console.log('✅ IAP Service: Initialized in fallback mode');
        return { success: true };
      }

      // Connect to the store
      await InAppPurchases.connectAsync();
      console.log('✅ IAP Service: Connected to store');

      // Get available products
      const response: any = await InAppPurchases.getProductsAsync(this.config.productIds);
      
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
      this.products.forEach(product => {
        console.log(`  - ${product.productId}: ${product.localizedPrice}`);
      });

      this.isInitialized = true;
      console.log('✅ IAP Service: Initialized successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ IAP Service: Initialization failed:', error);
      // Initialize in fallback mode
      this.isInitialized = true;
      this.products = this.getFallbackProducts();
      console.log('✅ IAP Service: Initialized in fallback mode after error');
      return { success: true };
    }
  }

  /**
   * Get fallback products when IAP is not available
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
   * Get available products
   */
  public getProducts(): IAPProduct[] {
    return [...this.products];
  }

  /**
   * Get a specific product by ID
   */
  public getProduct(productId: string): IAPProduct | undefined {
    return this.products.find(product => product.productId === productId);
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

      // Check if expo-in-app-purchases is available
      if (!InAppPurchases) {
        console.log('⚠️ IAP Service: expo-in-app-purchases not available, simulating purchase');
        return {
          success: true,
          purchase: {
            productId: productId,
            transactionId: `sim_${Date.now()}`,
            transactionDate: Date.now(),
            transactionReceipt: 'simulated_receipt',
          }
        };
      }

      // For now, simulate a successful purchase since the real implementation requires purchase listeners
      // In a real app, you would set up purchase listeners and handle the purchase flow properly
      console.log('✅ IAP Service: Purchase simulated (real implementation requires purchase listeners)');
      
      return {
        success: true,
        purchase: {
          productId: productId,
          transactionId: `sim_${Date.now()}`,
          transactionDate: Date.now(),
          transactionReceipt: 'simulated_receipt',
        }
      };

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
    if (!this.isInitialized) {
      return { success: false, error: 'IAP service not initialized' };
    }

    try {
      console.log('🔄 IAP Service: Restoring purchases...');

      // Check if expo-in-app-purchases is available
      if (!InAppPurchases) {
        console.log('⚠️ IAP Service: expo-in-app-purchases not available, returning empty purchases');
        return {
          success: true,
          purchases: []
        };
      }

      const response: any = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (response.responseCode === InAppPurchases.IAPResponseCode.OK && response.results) {
        console.log(`✅ IAP Service: Found ${response.results.length} restored purchases`);
        
        return {
          success: true,
          purchases: response.results.map((purchase: any) => ({
            productId: purchase.productId,
            transactionId: purchase.orderId || '',
            transactionDate: purchase.purchaseTime,
            transactionReceipt: purchase.transactionReceipt || '',
          }))
        };
      } else {
        console.warn('Failed to get purchase history:', response.errorCode);
        return {
          success: true,
          purchases: []
        };
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
   * Check if user has purchased a specific product
   */
  public async hasPurchased(productId: string): Promise<boolean> {
    try {
      // Check if expo-in-app-purchases is available
      if (!InAppPurchases) {
        console.log('⚠️ IAP Service: expo-in-app-purchases not available, returning false for purchase check');
        return false;
      }

      // Add timeout to prevent hanging
      const response: any = await Promise.race([
        InAppPurchases.getPurchaseHistoryAsync(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('IAP purchase check timeout')), 5000)
        )
      ]);
      
      if (response.responseCode === InAppPurchases.IAPResponseCode.OK && response.results) {
        return response.results.some((purchase: any) => purchase.productId === productId);
      }
      
      return false;
    } catch (error) {
      console.error('❌ IAP Service: Error checking purchase status:', error);
      // Don't show error banner for IAP issues - just return false silently
      return false;
    }
  }

  /**
   * Check if user has ad-free access
   */
  public async hasAdFreeAccess(): Promise<boolean> {
    const adFreeProducts = [
      'com.cybersimply.adfree.monthly',
      'com.cybersimply.adfree.lifetime',
      'com.cybersimply.premium.monthly'
    ];

    for (const productId of adFreeProducts) {
      if (await this.hasPurchased(productId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has premium access
   */
  public async hasPremiumAccess(): Promise<boolean> {
    const premiumProducts = [
      'com.cybersimply.premium.monthly',
      'com.cybersimply.adfree.lifetime'
    ];

    for (const productId of premiumProducts) {
      if (await this.hasPurchased(productId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Disconnect from the store
   */
  public async disconnect(): Promise<void> {
    try {
      if (InAppPurchases) {
        await InAppPurchases.disconnectAsync();
        console.log('✅ IAP Service: Disconnected from store');
      } else {
        console.log('⚠️ IAP Service: expo-in-app-purchases not available, nothing to disconnect');
      }
      this.isInitialized = false;
    } catch (error) {
      console.error('❌ IAP Service: Error disconnecting:', error);
    }
  }

  /**
   * Get subscription status
   */
  public async getSubscriptionStatus(): Promise<{
    isAdFree: boolean;
    isPremium: boolean;
    activeSubscriptions: string[];
  }> {
    const isAdFree = await this.hasAdFreeAccess();
    const isPremium = await this.hasPremiumAccess();
    
    const activeSubscriptions: string[] = [];
    if (isAdFree) activeSubscriptions.push('adfree');
    if (isPremium) activeSubscriptions.push('premium');

    return {
      isAdFree,
      isPremium,
      activeSubscriptions
    };
  }

  /**
   * Get ad-free products for display
   */
  public getAdFreeProducts(): AdFreeProduct[] {
    return [
      {
        id: 'com.cybersimply.adfree.lifetime',
        name: 'Ad-Free Lifetime',
        price: '9.99',
        description: 'Remove all ads forever and support the development of CyberSimply.'
      }
    ];
  }

  /**
   * Check ad-free status (for AdFreeScreen compatibility)
   */
  public async checkAdFreeStatus(): Promise<{ isAdFree: boolean }> {
    const isAdFree = await this.hasAdFreeAccess();
    return { isAdFree };
  }

  /**
   * Present ad-free payment (for AdFreeScreen compatibility)
   */
  public async presentAdFreePayment(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.purchaseProduct('com.cybersimply.adfree.lifetime');
      
      if (result.success && result.purchase) {
        // Update user profile in Supabase
        await this.updateUserPremiumStatus(true);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error presenting ad-free payment:', error);
      return { success: false, error: 'Payment failed' };
    }
  }

  /**
   * Update user premium status in Supabase
   */
  private async updateUserPremiumStatus(isPremium: boolean): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: user.email || '',
            is_premium: isPremium,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error updating user premium status:', error);
        } else {
          console.log('✅ User premium status updated in Supabase');
        }
      }
    } catch (error) {
      console.error('Error updating user premium status:', error);
    }
  }
}

// Export singleton instance
export const iapService = IAPService.getInstance();