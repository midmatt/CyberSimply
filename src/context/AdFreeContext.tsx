import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSupabase } from './SupabaseContext';
import { iapService } from '../services/iapService';

interface AdFreeStatus {
  isAdFree: boolean;
  totalDonated: number;
  email?: string;
  purchaseDate?: string;
  expiresAt?: string;
}

interface AdFreeContextType {
  adFreeStatus: AdFreeStatus | null;
  setAdFreeStatus: (status: AdFreeStatus | null) => void;
  isAdFree: boolean;
  checkAdFreeStatus: () => Promise<void>;
  clearAdFreeStatus: () => Promise<void>;
  isLoading: boolean;
}

const AdFreeContext = createContext<AdFreeContextType | undefined>(undefined);

interface AdFreeProviderProps {
  children: ReactNode;
}

export function AdFreeProvider({ children }: AdFreeProviderProps) {
  const { authState } = useSupabase();
  const [adFreeStatus, setAdFreeStatus] = useState<AdFreeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load ad-free status when user changes
  useEffect(() => {
    if (authState.isAuthenticated && authState.user) {
      checkAdFreeStatus();
    } else {
      setAdFreeStatus(null);
    }
  }, [authState.isAuthenticated, authState.user]);

  const loadAdFreeStatus = async () => {
    try {
      const storedStatus = await AsyncStorage.getItem('adFreeStatus');
      if (storedStatus) {
        const status = JSON.parse(storedStatus);
        setAdFreeStatus(status);
        console.log('Loaded ad-free status from storage:', status);
      }
    } catch (error) {
      console.error('Error loading ad-free status from storage:', error);
    }
  };

  const checkAdFreeStatus = async () => {
    if (!authState.isAuthenticated || !authState.user) {
      setAdFreeStatus(null);
      return;
    }

    setIsLoading(true);
    try {
      // Check IAP service first
      const iapResult = await iapService.checkAdFreeStatus();
      
      if (iapResult.isAdFree) {
        // User has ad-free access via IAP
        const status: AdFreeStatus = {
          isAdFree: true,
          totalDonated: 9.99, // Ad-free purchase amount
          email: authState.user.email,
          purchaseDate: new Date().toISOString(),
        };
        
        setAdFreeStatus(status);
        
        // Update local storage
        await AsyncStorage.setItem('adFreeStatus', JSON.stringify(status));
        console.log('Ad-free status confirmed from IAP service');
      } else {
        // Check local storage as fallback
        await loadAdFreeStatus();
      }
    } catch (error) {
      console.error('Error checking ad-free status:', error);
      // Fallback to local storage
      await loadAdFreeStatus();
    } finally {
      setIsLoading(false);
    }
  };

  const clearAdFreeStatus = async () => {
    try {
      await AsyncStorage.removeItem('adFreeStatus');
      setAdFreeStatus(null);
      console.log('Cleared ad-free status');
    } catch (error) {
      console.error('Error clearing ad-free status:', error);
    }
  };

  const isAdFree = adFreeStatus?.isAdFree || false;

  const value: AdFreeContextType = {
    adFreeStatus,
    setAdFreeStatus,
    isAdFree,
    checkAdFreeStatus,
    clearAdFreeStatus,
    isLoading,
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