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

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 App: Starting fallback initialization...');
        
        // Just wait a moment for basic setup
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('✅ Basic initialization completed');
      } catch (e) {
        console.error('❌ App initialization error:', e);
      } finally {
        // Always hide splash screen
        console.log('👋 Hiding splash screen...');
        try {
          await RNBootSplash.hide();
          console.log('✅ Splash screen hidden successfully');
        } catch (hideError) {
          console.warn('⚠️ Error hiding splash screen:', hideError);
        }
        setIsInitialized(true);
      }
    }
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ App initialization timeout, forcing app to load...');
      try {
        RNBootSplash.hide();
      } catch (e) {
        console.warn('⚠️ Error hiding splash screen in timeout:', e);
      }
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
