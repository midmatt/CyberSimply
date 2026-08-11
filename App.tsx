import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { StartupOrchestrator, createBasicStartupSteps, createServiceStartupSteps, createHeavyStartupSteps } from './src/app/startup/startupOrchestrator';
import { SafeSplashScreen } from './src/app/startup/splashDetector';

// Import context providers
import { ThemeProvider } from './src/context/ThemeContext';
import { AppProvider } from './src/context/AppContext';
import { SupabaseProvider } from './src/context/SupabaseContext';
import { AdFreeProvider } from './src/context/AdFreeContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';



interface AppState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  progress: string;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    isInitialized: false,
    isLoading: true,
    error: null,
    progress: 'Starting app...'
  });

  const updateProgress = useCallback((progress: string) => {
    setAppState(prev => ({ ...prev, progress }));
  }, []);

  const setError = useCallback((error: string) => {
    setAppState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const setInitialized = useCallback(() => {
    setAppState(prev => ({ ...prev, isInitialized: true, isLoading: false, error: null }));
  }, []);

  useEffect(() => {
    let isMounted = true;
    let didRevealApp = false;
    const splashScreen = new SafeSplashScreen();
    let watchdogTimeout: ReturnType<typeof setTimeout> | null = null;

    const revealApp = async (reason: 'basic-ready' | 'watchdog' | 'error') => {
      if (!isMounted || didRevealApp) return;
      didRevealApp = true;
      if (watchdogTimeout) {
        clearTimeout(watchdogTimeout);
        watchdogTimeout = null;
      }
      try {
        await splashScreen.hide();
      } catch (hideError) {
        console.warn('Failed to hide splash screen:', hideError);
      }
      if (reason === 'watchdog') {
        // Only warn if we truly never made it past basic init.
        console.warn('⚠️ [App] Watchdog timeout - forcing app to load');
      }
      setInitialized();
    };

    async function initializeApp() {
      try {
        console.log('🚀 [App] Starting robust initialization...');
        
        // Prevent splash screen from auto-hiding
        await splashScreen.preventAutoHide();
        
        // Create startup orchestrator
        const orchestrator = new StartupOrchestrator();
        
        // Add basic startup steps (critical for first render)
        updateProgress('Initializing core systems...');
        const basicSteps = createBasicStartupSteps();
        basicSteps.forEach(step => orchestrator.addStep(step));
        
        // Execute basic steps first
        const basicResult = await orchestrator.execute();
        console.log('🚀 [App] Basic initialization result:', basicResult);
        
        if (!isMounted) return;
        
        // Reveal UI as soon as basics are done. Clear the watchdog here —
        // heavy steps (IAP, etc.) continue in the background and must not
        // trip a false "forcing app to load" warning.
        updateProgress('Preparing interface...');
        await revealApp('basic-ready');
        
        if (!isMounted) return;
        
        // Continue with service initialization in background
        updateProgress('Loading services...');
        const serviceOrchestrator = new StartupOrchestrator();
        const serviceSteps = createServiceStartupSteps();
        serviceSteps.forEach(step => serviceOrchestrator.addStep(step));
        
        const serviceResult = await serviceOrchestrator.execute();
        console.log('🚀 [App] Service initialization result:', serviceResult);
        
        if (!isMounted) return;
        
        // Continue with heavy initialization in background
        updateProgress('Loading additional features...');
        const heavyOrchestrator = new StartupOrchestrator();
        const heavySteps = createHeavyStartupSteps();
        heavySteps.forEach(step => heavyOrchestrator.addStep(step));
        
        const heavyResult = await heavyOrchestrator.execute();
        console.log('🚀 [App] Heavy initialization result:', heavyResult);
        
        console.log('🎉 [App] All initialization completed');
        
      } catch (error) {
        console.error('❌ [App] Initialization error:', error);
        
        if (isMounted) {
          await revealApp('error');
          
          // Set a more user-friendly error message (non-blocking — app still shows)
          const errorMessage = error instanceof Error 
            ? `Initialization failed: ${error.message}` 
            : 'Initialization failed. The app will continue with limited functionality.';
          
          setError(errorMessage);
        }
      }
    }

    // Watchdog only covers the critical path before first paint.
    watchdogTimeout = setTimeout(() => {
      void revealApp('watchdog');
    }, 4000);

    void initializeApp();

    return () => {
      isMounted = false;
      if (watchdogTimeout) clearTimeout(watchdogTimeout);
    };
  }, [updateProgress, setError, setInitialized]);

  // Show loading screen while initializing
  if (appState.isLoading) {
    return (
      <GestureHandlerRootView style={styles.loadingContainer}>
        <SafeAreaProvider>
          <StatusBar style="light" backgroundColor="#000000" />
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>
              {appState.progress}
            </Text>
            {appState.error && (
              <Text style={styles.errorText}>
                {appState.error}
              </Text>
            )}
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Show error screen if initialization failed
  if (appState.error) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <View style={styles.errorContainer}>
            <Text style={styles.title}>CyberSimply</Text>
            <Text style={styles.subtitle}>App Error</Text>
            <Text style={styles.description}>
              {appState.error}
            </Text>
            <Text style={styles.retryText}>
              The app will continue to work with limited functionality.
            </Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Show main app
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
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
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 24,
    color: '#FF6B35',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  retryText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
