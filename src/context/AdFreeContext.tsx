import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSupabase } from './SupabaseContext';
import { supabase } from '../services/supabaseClientProduction';
import { storeKitIAPService } from '../services/storeKitIAPService';
import { localStorageService } from '../services/localStorageService';

interface AdFreeStatus {
  isAdFree: boolean;
  productType?: 'lifetime' | 'subscription';
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
    if (supabaseContext?.authState?.isAuthenticated && supabaseContext?.authState?.user) {
      // Check ad-free status from Supabase (account-based)
      checkAdFreeStatus();
    } else {
      setAdFreeStatus(null);
      setError(null);
      // Only clear local cache when user logs out (not the Supabase data)
      localStorageService.clearAdFreeStatus();
    }
  }, [supabaseContext?.authState?.isAuthenticated, supabaseContext?.authState?.user]);

  const checkAdFreeStatus = async () => {
    if (!supabaseContext?.authState?.isAuthenticated || !supabaseContext?.authState?.user) {
      console.log('🔍 [AdFree] User not authenticated, clearing ad-free status');
      setAdFreeStatus(null);
      await localStorageService.clearAdFreeStatus();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 [AdFree] Checking ad-free status for user:', supabaseContext?.authState?.user?.id);
      
      // First check local storage for immediate UI response
      const localStatus = await localStorageService.getAdFreeStatus();
      if (localStatus && localStorageService.isAdFreeStatusValid(localStatus.storedAt)) {
        console.log('🔍 [AdFree] Using cached ad-free status:', localStatus);
        setAdFreeStatus({
          isAdFree: localStatus.isAdFree,
          productType: localStatus.productType,
          expiresAt: localStatus.expiresAt,
          lastChecked: localStatus.lastChecked,
        });
        
        // Still check Supabase in background for updates
        checkSupabaseStatus();
        return;
      }

      // If no valid local cache, check Supabase directly
      await checkSupabaseStatus();

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
      
      // Check Supabase directly (only if verified purchase)
      // Use optional fields in case columns don't exist yet
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', supabaseContext.authState.user.id)
        .single();

      if (profileError) {
        console.warn('⚠️ [AdFree] Error fetching user profile:', profileError);
        // Don't throw - just log warning and assume not ad-free
        console.log('🔍 [AdFree] Assuming user is not ad-free due to profile error');
        
        const status: AdFreeStatus = {
          isAdFree: false,
          lastChecked: new Date().toISOString(),
        };
        setAdFreeStatus(status);
        await localStorageService.setAdFreeStatus(status);
        return;
      }

      // Safely access ad_free with fallback to is_premium (backwards compatibility)
      const isAdFree = profile?.ad_free ?? profile?.is_premium ?? false;
      
      console.log('🔍 [AdFree] Supabase profile data:', {
        ad_free: profile?.ad_free,
        is_premium: profile?.is_premium,
        premium_expires_at: profile?.premium_expires_at,
        product_type: profile?.product_type,
        userId: supabaseContext?.authState?.user?.id,
        computed_isAdFree: isAdFree
      });

      if (isAdFree) {
        // User has verified ad-free access (only set after confirmed purchase)
        const status: AdFreeStatus = {
          isAdFree: true,
          productType: (profile?.product_type as 'lifetime' | 'subscription') || 'lifetime',
          expiresAt: profile?.premium_expires_at,
          lastChecked: new Date().toISOString(),
        };
        
        setAdFreeStatus(status);
        
        // Store in local storage for future quick access
        await localStorageService.setAdFreeStatus(status);
        await localStorageService.setLastSync();
        
        console.log('✅ [AdFree] User has verified ad-free access (Supabase) - stored locally');
        return;
      }

      // If not ad-free in Supabase, check StoreKit IAP service
      console.log('🔍 [AdFree] No verified purchase in Supabase, checking StoreKit...');
      const iapResult = await storeKitIAPService.checkAdFreeStatus();
      
      if (iapResult.isAdFree) {
        const status: AdFreeStatus = {
          isAdFree: true,
          productType: iapResult.productType,
          expiresAt: iapResult.expiresAt,
          lastChecked: new Date().toISOString(),
        };
        
        setAdFreeStatus(status);
        
        // Store in local storage
        await localStorageService.setAdFreeStatus(status);
        await localStorageService.setLastSync();
        
        console.log('✅ [AdFree] User has ad-free access (StoreKit) - stored locally');
      } else {
        // No ad-free access - NEVER set to true by default
        const status: AdFreeStatus = {
          isAdFree: false,
          lastChecked: new Date().toISOString(),
        };
        
        setAdFreeStatus(status);
        
        // Store in local storage
        await localStorageService.setAdFreeStatus(status);
        await localStorageService.setLastSync();
        
        console.log('❌ [AdFree] User does not have ad-free access - stored locally');
      }
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