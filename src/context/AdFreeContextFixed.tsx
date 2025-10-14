import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSupabase } from './SupabaseContext';
import { iapServiceFixed } from '../services/iapServiceFixed';
import { localStorageService } from '../services/localStorageService';

interface AdFreeStatus {
  isAdFree: boolean;
  productType?: 'lifetime' | 'subscription';
  expiresAt?: string;
  lastChecked?: string;
}

interface AdFreeContextType {
  adFreeStatus: AdFreeStatus | null;
  isLoading: boolean;
  error: string | null;
  checkAdFreeStatus: () => Promise<void>;
  refreshAdFreeStatus: () => Promise<void>;
  purchaseAdFree: (productId: string) => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
}

const AdFreeContext = createContext<AdFreeContextType | undefined>(undefined);

interface AdFreeProviderProps {
  children: ReactNode;
}

export function AdFreeProviderFixed({ children }: AdFreeProviderProps) {
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
      console.log('🔍 [AdFree] User authenticated, checking ad-free status...');
      checkAdFreeStatus();
    } else {
      console.log('🔍 [AdFree] User not authenticated, clearing ad-free status');
      setAdFreeStatus(null);
      setError(null);
      // Clear local cache when user logs out
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
        
        // Still check in background for updates
        checkAdFreeStatusInBackground();
        return;
      }

      // If no valid local cache, check directly
      await checkAdFreeStatusDirect();

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

  const checkAdFreeStatusInBackground = async () => {
    try {
      await checkAdFreeStatusDirect();
    } catch (error) {
      console.error('❌ [AdFree] Error in background check:', error);
    }
  };

  const checkAdFreeStatusDirect = async () => {
    try {
      console.log('🔍 [AdFree] Checking ad-free status directly...');
      
      // Use the new IAP service to check status
      const status = await iapServiceFixed.checkAdFreeStatus();
      
      console.log('🔍 [AdFree] IAP service status:', status);

      if (status.isAdFree) {
        console.log('✅ [AdFree] User has ad-free access');
        
        const adFreeStatus: AdFreeStatus = {
          isAdFree: true,
          productType: status.productType,
          expiresAt: status.expiresAt,
          lastChecked: status.lastChecked || new Date().toISOString(),
        };
        
        setAdFreeStatus(adFreeStatus);
        
        // Store in local storage for future quick access
        await localStorageService.setAdFreeStatus(adFreeStatus);
        await localStorageService.setLastSync();
        
        console.log('✅ [AdFree] Ad-free status updated and stored locally');
      } else {
        console.log('❌ [AdFree] User does not have ad-free access');
        
        const adFreeStatus: AdFreeStatus = {
          isAdFree: false,
          lastChecked: new Date().toISOString(),
        };
        
        setAdFreeStatus(adFreeStatus);
        await localStorageService.setAdFreeStatus(adFreeStatus);
      }

    } catch (error) {
      console.error('❌ [AdFree] Error checking ad-free status directly:', error);
      
      // On error, assume not ad-free (safe default)
      const adFreeStatus: AdFreeStatus = {
        isAdFree: false,
        lastChecked: new Date().toISOString(),
      };
      
      setAdFreeStatus(adFreeStatus);
      await localStorageService.setAdFreeStatus(adFreeStatus);
    }
  };

  const purchaseAdFree = async (productId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🛒 [AdFree] Purchasing ad-free:', productId);
      
      if (!supabaseContext?.authState?.isAuthenticated) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await iapServiceFixed.purchaseProduct(productId);
      
      if (result.success) {
        console.log('✅ [AdFree] Purchase successful, refreshing status...');
        // Refresh status after successful purchase
        await checkAdFreeStatus();
        return { success: true };
      } else {
        console.error('❌ [AdFree] Purchase failed:', result.error);
        return { success: false, error: result.error };
      }

    } catch (error) {
      console.error('❌ [AdFree] Error purchasing ad-free:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Purchase failed' 
      };
    }
  };

  const restorePurchases = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔄 [AdFree] Restoring purchases...');
      
      if (!supabaseContext?.authState?.isAuthenticated) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await iapServiceFixed.restorePurchases();
      
      if (result.success) {
        console.log('✅ [AdFree] Restore successful, refreshing status...');
        // Refresh status after successful restore
        await checkAdFreeStatus();
        return { success: true };
      } else {
        console.error('❌ [AdFree] Restore failed:', result.error);
        return { success: false, error: result.error };
      }

    } catch (error) {
      console.error('❌ [AdFree] Error restoring purchases:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Restore failed' 
      };
    }
  };

  const refreshAdFreeStatus = async () => {
    console.log('🔄 [AdFree] Refreshing ad-free status...');
    await checkAdFreeStatus();
  };

  const value: AdFreeContextType = {
    adFreeStatus,
    isLoading,
    error,
    checkAdFreeStatus,
    refreshAdFreeStatus,
    purchaseAdFree,
    restorePurchases,
  };

  return (
    <AdFreeContext.Provider value={value}>
      {children}
    </AdFreeContext.Provider>
  );
}

export function useAdFreeFixed(): AdFreeContextType {
  const context = useContext(AdFreeContext);
  if (context === undefined) {
    throw new Error('useAdFreeFixed must be used within an AdFreeProviderFixed');
  }
  return context;
}
