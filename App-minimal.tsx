import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import RNBootSplash from 'react-native-bootsplash';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 App: Starting minimal initialization...');
        
        // Just wait a moment for basic setup
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
    }, 3000); // 3 seconds total timeout
    
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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>
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
        <StatusBar style="auto" />
        <View style={styles.container}>
          <Text style={styles.title}>CyberSimply</Text>
          <Text style={styles.subtitle}>App is working!</Text>
          <Text style={styles.description}>
            The app has successfully loaded past the splash screen.
          </Text>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 20,
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  },
});
