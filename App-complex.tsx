import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, ActivityIndicator, useColorScheme, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNBootSplash from 'react-native-bootsplash';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
import { AppProvider } from './src/context/AppContext';
import { AdFreeProvider } from './src/context/AdFreeContext';
import { SupabaseProvider } from './src/context/SupabaseContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { adService } from './src/services/adService';
import { notificationService } from './src/services/notificationService';
import { iapService } from './src/services/iapService';
import { NewsApiService } from './src/services/newsApiService';
import { authService } from './src/services/authService';
import { AD_CONFIG } from './src/constants/adConfig';
import { useTheme } from './src/context/ThemeContext';



export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function prepare() {
      const startTime = Date.now();
      const MAX_INIT_TIME = 10000; // 10 seconds max initialization time
      
      try {
        console.log('🚀 App: Starting initialization...');

        // 1. Load fonts (with timeout)
        console.log('📝 Loading fonts...');
        await Promise.race([
          Font.loadAsync({
            // Add your custom fonts here if you have any
            // Inter: require('./assets/fonts/Inter-Regular.ttf'),
            // InterBold: require('./assets/fonts/Inter-Bold.ttf'),
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Font loading timeout')), 3000))
        ]);
        console.log('✅ Fonts loaded');

        // 2. Preload images (with timeout)
        console.log('🖼️ Preloading assets...');
        await Promise.race([
          Asset.loadAsync([
            require('./assets/icon.png'),
            require('./assets/splash-dark.png'),
            require('./assets/splash-light.png'),
          ]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Asset loading timeout')), 3000))
        ]);
        console.log('✅ Assets preloaded');

        // 3. Initialize IAP service (with timeout)
        try {
          console.log('🛒 Initializing IAP service...');
          const iapResult = await Promise.race([
            iapService.initialize(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('IAP timeout')), 2000))
          ]);
          if (iapResult.success) {
            console.log('✅ IAP service initialized successfully');
          } else {
            console.warn('⚠️ IAP service initialization failed:', iapResult.error);
          }
        } catch (iapError) {
          console.warn('⚠️ IAP service initialization failed (non-critical):', iapError);
        }

        // 4. Initialize ad service with error handling (with timeout)
        try {
          if (AD_CONFIG.ADMOB.SHOW_BANNER_ADS || AD_CONFIG.ADMOB.SHOW_INTERSTITIAL_ADS) {
            console.log('📺 Initializing ad service...');
            await Promise.race([
              adService.initialize(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Ad service timeout')), 3000))
            ]);
            console.log('✅ Ad service initialized successfully');
          }
        } catch (adError) {
          console.warn('⚠️ Ad service initialization failed (non-critical):', adError);
        }

        // 5. Initialize notification service with error handling (with timeout)
        try {
          console.log('🔔 Initializing notification service...');
          const notificationResult = await Promise.race([
            notificationService.initialize(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Notification service timeout')), 2000))
          ]);
          if (notificationResult.success) {
            console.log('✅ Notification service initialized successfully');
          } else {
            console.warn('⚠️ Notification service initialization failed:', notificationResult.error);
          }
        } catch (notificationError) {
          console.warn('⚠️ Notification service initialization failed (non-critical):', notificationError);
        }

        // 6. Wait for Supabase session restoration (with timeout)
        try {
          console.log('🔐 Waiting for Supabase session restoration...');
          let attempts = 0;
          const maxAttempts = 20; // 2 seconds max wait
          while (authService.getAuthState().isLoading && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          console.log('✅ Supabase session restoration completed');
        } catch (authError) {
          console.warn('⚠️ Supabase session restoration failed (non-critical):', authError);
        }

        // 7. Fetch initial news articles (with timeout)
        try {
          console.log('📰 Fetching initial news articles...');
          const articles = await Promise.race([
            NewsApiService.fetchLatestNews(1),
            new Promise((_, reject) => setTimeout(() => reject(new Error('News fetch timeout')), 5000))
          ]);
          console.log(`✅ Fetched ${articles.length} initial articles`);
        } catch (newsError) {
          console.warn('⚠️ Failed to fetch initial articles (non-critical):', newsError);
        }

        console.log('🎉 App initialization completed successfully');
      } catch (e) {
        console.error('❌ App initialization error:', e);
      } finally {
        // Always hide splash screen and show app, even if some services failed
        console.log('👋 Hiding splash screen...');
        await RNBootSplash.hide({ fade: true });
        console.log('✅ Splash screen hidden successfully');
        setIsInitialized(true);
      }
    }
    
    // Add overall timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ App initialization timeout, forcing app to load...');
      RNBootSplash.hide({ fade: true });
      setIsInitialized(true);
    }, 15000); // 15 seconds total timeout
    
    prepare().finally(() => {
      clearTimeout(timeoutId);
    });
  }, []);

  // Show loading screen while initializing to prevent white screen
  if (!isInitialized) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
        <SafeAreaProvider>
          <StatusBar style="light" backgroundColor="#000000" />
          <View style={{ 
            flex: 1, 
            backgroundColor: '#000000', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', marginTop: 20, fontSize: 16 }}>
              Loading CyberSimply...
            </Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SupabaseProvider>
            <AppProvider>
              <AdFreeProvider>
                <StatusBar style="auto" />
                <AppNavigator />
              </AdFreeProvider>
            </AppProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
