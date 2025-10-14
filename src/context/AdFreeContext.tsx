import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSupabase } from './SupabaseContext';
import { supabase } from '../services/supabaseClientProduction';
import { iapService } from '../services/iapService';
import { localStorageService } from '../services/localStorageService';

interface AdFreeStatus {
  isAdFree: boolean;
  productType?: 'subscription';
  expiresAt?: string;
  lastChecked?: string;
}

interface AdFreeContextType {
  adFreeStatus: AdFreeStatus | null;
  isAdFree: boolean;
  checkAdFreeStatus: () => Promise<void>;
  refreshAdFreeStatus: () => Promise<void>;
  clearAdFreeStatus: () => Promise<void>; // For when user cancels subscription
  isLoading: boolean;
  error: string | null;
}

const AdFreeContext = createContext<AdFreeContextType | undefined>(undefined);

interface AdFreeProviderProps {
  children: ReactNode;
}

export function AdFreeProvider({ children }: AdFreeProviderProps) {
  // Use try-catch to safely get Supabase context
  let supabaseContext;
  try {
    supabaseContext = useSupabase();
  } catch (error) {
    console.warn('AdFreeContext: SupabaseContext not available, using fallback');
    supabaseContext = null;
  }

  const [adFreeStatus, setAdFreeStatus] = useState<AdFreeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load ad-free status when user changes
  useEffect(() => {
    const isGuest = supabaseContext?.authState?.isGuest;
    const isAuthenticated = supabaseContext?.authState?.isAuthenticated;
    
    if (isAuthenticated || isGuest) {
      // Check ad-free status for both authenticated and guest users
      if (!isGuest && supabaseContext?.authState?.user) {
        // For authenticated users, clear local cache to force Supabase check
        localStorageService.clearAdFreeStatus();
      }
      // Check ad-free status (handles both guest and authenticated)
      checkAdFreeStatus();
    } else {
      // Only clear if truly no user session (not guest, not authenticated)
      setAdFreeStatus(null);
      setError(null);
      localStorageService.clearAdFreeStatus();
    }
  }, [supabaseContext?.authState?.isAuthenticated, supabaseContext?.authState?.isGuest, supabaseContext?.authState?.user]);

  const checkAdFreeStatus = async () => {
    // Apple IAP compliance: Support guest users with local storage
    const isGuest = supabaseContext?.authState?.isGuest;
    
    if (!supabaseContext?.authState?.isAuthenticated && !isGuest) {
      console.log('🔍 [AdFree] No user session, clearing ad-free status');
      setAdFreeStatus(null);
      await localStorageService.clearAdFreeStatus();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 [AdFree] Checking ad-free status for user:', {
        userId: supabaseContext?.authState?.user?.id,
        isGuest: isGuest
      });
      
      // For guest users, check local storage first
      if (isGuest) {
        console.log('🔍 [AdFree] Guest user - checking local storage...');
        const localStatus = await localStorageService.getAdFreeStatus();
        
        if (localStatus?.isAdFree) {
          console.log('✅ [AdFree] Guest has local ad-free status:', localStatus);
          setAdFreeStatus({
            isAdFree: true,
            productType: localStatus.productType as 'subscription',
            expiresAt: localStatus.expiresAt,
            lastChecked: new Date().toISOString(),
          });
        } else {
          console.log('❌ [AdFree] No local ad-free status for guest');
          setAdFreeStatus({
            isAdFree: false,
            lastChecked: new Date().toISOString(),
          });
        }
      } else {
        // For authenticated users, check Supabase
        console.log('🔍 [AdFree] Authenticated user - clearing cache and checking Supabase...');
        await localStorageService.clearAdFreeStatus();
        await checkSupabaseStatus();
      }

    } catch (error) {
      console.error('❌ [AdFree] Error checking ad-free status:', error);
      setError(error instanceof Error ? error.message : 'Failed to check ad-free status');
      
      // Set default state on error - NEVER set to true by default
      setAdFreeStatus({
        isAdFree: false,
        lastChecked: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkSupabaseStatus = async () => {
    try {
      console.log('🔍 [AdFree] Checking Supabase for ad-free status...');
      
      // Ensure supabase client is available
      if (!supabase) {
        console.error('❌ [AdFree] Supabase client not available');
        throw new Error('Supabase client not available');
      }

      // Ensure we have a valid user
      if (!supabaseContext?.authState?.user?.id) {
        console.log('🔍 [AdFree] No user ID available, skipping Supabase check');
        return;
      }
      
      const userId = supabaseContext.authState.user.id;
      
      // STEP 1: Check user_iap table for active purchases (source of truth)
      console.log('🔍 [AdFree] Step 1: Checking user_iap for active purchases...');
      const { data: activePurchases, error: iapError } = await supabase
        .from('user_iap')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .or('expires_date.is.null,expires_date.gt.' + new Date().toISOString())
        .order('purchase_date', { ascending: false })
        .limit(1);

      if (!iapError && activePurchases && activePurchases.length > 0) {
        const purchase = activePurchases[0];
        const isSubscription = purchase.expires_date !== null;
        
        console.log('✅ [AdFree] Active purchase found in user_iap:', {
          productId: purchase.product_id,
          type: isSubscription ? 'subscription' : 'lifetime',
          expiresAt: purchase.expires_date,
        });
        
        const status: AdFreeStatus = {
          isAdFree: true,
          productType: 'subscription',
          expiresAt: purchase.expires_date,
          lastChecked: new Date().toISOString(),
        };
        
        setAdFreeStatus(status);
        await localStorageService.setAdFreeStatus(status);
        await localStorageService.setLastSync();
        
        console.log('✅ [AdFree] Ad-free status confirmed from user_iap table');
        return;
      }

      // STEP 2: Check user_profiles.ad_free for legacy purchases (DISABLED FOR TESTING)
      console.log('🔍 [AdFree] Step 2: Skipping legacy check - forcing purchase flow for testing');
      
      // TEMPORARY: Skip legacy check to force all users through purchase flow
      // Uncomment this section once you have real purchases
      /*
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('ad_free, is_premium, premium_expires_at, product_type')
        .eq('id', userId)
        .single();

      if (!profileError && profile?.ad_free === true) {
        console.log('✅ [AdFree] Legacy ad-free status found in user_profiles');
        
        const status: AdFreeStatus = {
          isAdFree: true,
          productType: (profile.product_type as 'lifetime' | 'subscription') || 'lifetime',
          expiresAt: profile.premium_expires_at,
          lastChecked: new Date().toISOString(),
        };
        
        setAdFreeStatus(status);
        await localStorageService.setAdFreeStatus(status);
        await localStorageService.setLastSync();
        
        console.log('✅ [AdFree] Legacy ad-free status confirmed');
        return;
      }
      */

      // STEP 3: Check StoreKit for unreported purchases
      console.log('🔍 [AdFree] Step 3: Checking StoreKit for unreported purchases...');
      const iapResult = await iapService.checkAdFreeStatus();
      
      if (iapResult.isAdFree) {
        console.log('✅ [AdFree] Unreported purchase found in StoreKit');
        
        const status: AdFreeStatus = {
          isAdFree: true,
          productType: iapResult.productType,
          expiresAt: iapResult.expiresAt,
          lastChecked: new Date().toISOString(),
        };
        
        setAdFreeStatus(status);
        await localStorageService.setAdFreeStatus(status);
        await localStorageService.setLastSync();
        
        console.log('✅ [AdFree] StoreKit purchase confirmed and will sync to Supabase');
        return;
      }

      // STEP 4: No ad-free access found anywhere
      console.log('❌ [AdFree] No ad-free access found');
      const status: AdFreeStatus = {
        isAdFree: false,
        lastChecked: new Date().toISOString(),
      };
      
      setAdFreeStatus(status);
      await localStorageService.setAdFreeStatus(status);
      await localStorageService.setLastSync();
      
    } catch (error) {
      console.error('❌ [AdFree] Error checking Supabase status:', error);
      throw error;
    }
  };

  const refreshAdFreeStatus = async () => {
    console.log('🔄 Refreshing ad-free status...');
    
    // Clear local cache to force fresh check
    await localStorageService.clearAdFreeStatus();
    
    // Force fresh check
    await checkAdFreeStatus();
  };

  const clearAdFreeStatus = async () => {
    console.log('🗑️ [AdFree] Clearing ad-free status (subscription cancelled)');
    
    // Clear local cache
    await localStorageService.clearAdFreeStatus();
    
    // Update Supabase to remove ad-free status
    if (supabaseContext?.authState?.user?.id) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            ad_free: false,
            is_premium: false,
            premium_expires_at: null,
            product_type: null,
            purchase_date: null
          })
          .eq('id', supabaseContext.authState.user.id);

        if (error) {
          console.error('❌ [AdFree] Error updating Supabase:', error);
        } else {
          console.log('✅ [AdFree] Updated Supabase to remove ad-free status');
        }
      } catch (error) {
        console.error('❌ [AdFree] Error updating Supabase:', error);
      }
    }
    
    // Update local state
    setAdFreeStatus({
      isAdFree: false,
      lastChecked: new Date().toISOString(),
    });
  };

  const isAdFree = adFreeStatus?.isAdFree || false;

  const value: AdFreeContextType = {
    adFreeStatus,
    isAdFree,
    checkAdFreeStatus,
    refreshAdFreeStatus,
    clearAdFreeStatus,
    isLoading,
    error,
  };

  return (
    <AdFreeContext.Provider value={value}>
      {children}
    </AdFreeContext.Provider>
  );
}

export function useAdFree() {
  const context = useContext(AdFreeContext);
  if (context === undefined) {
    throw new Error('useAdFree must be used within an AdFreeProvider');
  }
  return context;
}