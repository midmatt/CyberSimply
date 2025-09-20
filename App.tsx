import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';

// Context providers
import { AppProvider } from './src/context/AppContext';
import { AdFreeProvider } from './src/context/AdFreeContext';
import { SupabaseProvider } from './src/context/SupabaseContext';
import { ThemeProvider } from './src/context/ThemeContext';

// Services
import { iapService } from './src/services/iapService';
import { adService } from './src/services/adService';
import { notificationService } from './src/services/notificationService';
import { authService } from './src/services/authService';
import { NewsApiService } from './src/services/newsApiService';
import { launchFlagsService } from './src/services/launchFlagsService';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Constants
import { AD_CONFIG } from './src/constants/adConfig';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 App: Starting initialization...');

        // 1. Load fonts
        console.log('📝 Loading fonts...');
        await Font.loadAsync({
          // Add your custom fonts here if you have any
        });

        // 2. Preload images
        console.log('🖼️ Preloading assets...');
        await Asset.loadAsync([
          require('./assets/icon.png'),
          require('./assets/splash-dark.png'),
          require('./assets/splash-light.png'),
        ]);

        // 3. Initialize launch flags service
        console.log('🏁 Initializing launch flags...');
        await launchFlagsService.initialize();

        // 4. Initialize IAP service
        console.log('🛒 Initializing IAP service...');
        const iapResult = await iapService.initialize();
        if (iapResult.success) {
          console.log('✅ IAP service initialized');
        } else {
          console.warn('⚠️ IAP service initialization failed:', iapResult.error);
        }

        // 5. Initialize ad service
        console.log('📺 Initializing ad service...');
        if (AD_CONFIG.ADMOB.SHOW_BANNER_ADS || AD_CONFIG.ADMOB.SHOW_INTERSTITIAL_ADS) {
          try {
            await adService.initialize();
            console.log('✅ Ad service initialized');
          } catch (adError) {
            console.warn('⚠️ Ad service initialization failed:', adError);
          }
        }

        // 6. Initialize notification service
        console.log('🔔 Initializing notification service...');
        const notificationResult = await notificationService.initialize();
        if (notificationResult.success) {
          console.log('✅ Notification service initialized');
        } else {
          console.warn('⚠️ Notification service initialization failed:', notificationResult.error);
        }

        // 7. Restore session or set guest flag
        console.log('🔐 Restoring session...');
        const authState = authService.getAuthState();
        if (!authState.isLoading) {
          console.log('✅ Session restoration completed');
        } else {
          // Wait for session restoration
          let attempts = 0;
          const maxAttempts = 20; // 2 seconds max wait
          while (authService.getAuthState().isLoading && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          console.log('✅ Session restoration completed');
        }

        // 8. Prefetch first articles
        console.log('📰 Prefetching articles...');
        try {
          const articles = await NewsApiService.fetchLatestNews(1);
          console.log(`✅ Prefetched ${articles.length} articles`);
        } catch (newsError) {
          console.warn('⚠️ Failed to prefetch articles:', newsError);
        }

        console.log('🎉 App initialization completed successfully');
        
        // Set ready and hide splash screen
        setIsReady(true);
        await SplashScreen.hideAsync();
        console.log('✅ Splash screen hidden');

      } catch (error) {
        console.error('❌ App initialization error:', error);
        // Still set ready and hide splash even if there's an error
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  // Don't render anything until ready (keeps splash screen visible)
  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SupabaseProvider>
            <AppProvider>
              <AdFreeProvider>
                <StatusBar style="auto" />
                <ErrorBoundary>
                  <AppNavigator />
                </ErrorBoundary>
              </AdFreeProvider>
            </AppProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}