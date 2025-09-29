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
    const splashScreen = new SafeSplashScreen();

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
        
        // Hide splash screen as soon as basic steps are done
        updateProgress('Preparing interface...');
        await orchestrator.hideSplashScreen();
        
        if (!isMounted) return;
        
        // Mark as initialized for first render
        setInitialized();
        
        // Continue with service initialization in background
        updateProgress('Loading services...');
        const serviceSteps = createServiceStartupSteps();
        serviceSteps.forEach(step => orchestrator.addStep(step));
        
        const serviceResult = await orchestrator.execute();
        console.log('🚀 [App] Service initialization result:', serviceResult);
        
        if (!isMounted) return;
        
        // Continue with heavy initialization in background
        updateProgress('Loading additional features...');
        const heavySteps = createHeavyStartupSteps();
        heavySteps.forEach(step => orchestrator.addStep(step));
        
        const heavyResult = await orchestrator.execute();
        console.log('🚀 [App] Heavy initialization result:', heavyResult);
        
        console.log('🎉 [App] All initialization completed');
        
      } catch (error) {
        console.error('❌ [App] Initialization error:', error);
        
        if (isMounted) {
          // Even if initialization fails, show the app
          try {
            await splashScreen.hide();
          } catch (hideError) {
            console.warn('Failed to hide splash screen:', hideError);
          }
          
          // Set a more user-friendly error message
          const errorMessage = error instanceof Error 
            ? `Initialization failed: ${error.message}` 
            : 'Initialization failed. The app will continue with limited functionality.';
          
          setError(errorMessage);
        }
      }
    }

    // Set up watchdog timeout
    const watchdogTimeout = setTimeout(() => {
      console.warn('⚠️ [App] Watchdog timeout - forcing app to load');
      if (isMounted) {
        splashScreen.hide().then(() => {
          setInitialized();
        });
      }
    }, 4000); // 4 second watchdog

    // Start initialization
    initializeApp().finally(() => {
      clearTimeout(watchdogTimeout);
    });

    return () => {
      isMounted = false;
      clearTimeout(watchdogTimeout);
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
