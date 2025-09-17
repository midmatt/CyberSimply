import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, ActivityIndicator } from 'react-native';
import RNBootSplash from 'react-native-bootsplash';
import { AppProvider } from './src/context/AppContext';
import { AdFreeProvider } from './src/context/AdFreeContext';
import { SupabaseProvider } from './src/context/SupabaseContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 App: Starting simple initialization...');
        
        // Just wait a moment for basic setup
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('✅ Basic initialization completed');
      } catch (e) {
        console.error('❌ App initialization error:', e);
      } finally {
        // Always hide splash screen
        console.log('👋 Hiding splash screen...');
        await RNBootSplash.hide({ fade: true });
        console.log('✅ Splash screen hidden successfully');
        setIsInitialized(true);
      }
    }
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ App initialization timeout, forcing app to load...');
      RNBootSplash.hide({ fade: true });
      setIsInitialized(true);
    }, 5000); // 5 seconds total timeout
    
    prepare().finally(() => {
      clearTimeout(timeoutId);
    });
  }, []);

  // Show loading screen while initializing
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
