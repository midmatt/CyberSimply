import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import { useColorScheme } from 'react-native';

export function ThemedSplash() {
  const { colors } = useTheme();
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';
  const [imageError, setImageError] = useState(false);
  
  // Use the same logic as the logo swapping - if we're showing dark logo, show dark background
  const actualIsDark = isDark;
  
  // Force dark mode for testing - this should match the logo logic
  const forceDarkMode = true;
  const finalIsDark = forceDarkMode || actualIsDark;
  
  // Background and text colors that match the logo selection
  const finalBackgroundColor = finalIsDark ? '#000000' : '#ffffff';
  const finalTextColor = finalIsDark ? '#ffffff' : '#000000';
  const accentColor = '#007AFF';
  
  console.log('ThemedSplash: Theme detection', {
    systemColorScheme,
    actualIsDark,
    finalIsDark,
    finalBackgroundColor,
    finalTextColor,
    forceDarkMode,
    colors: colors ? 'available' : 'not available'
  });
  
  return (
    <>
      <StatusBar style={finalIsDark ? 'light' : 'dark'} backgroundColor={finalBackgroundColor} />
      <View style={{ 
        flex: 1, 
        backgroundColor: finalBackgroundColor, 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: 20
      }}>
        {/* Debug info */}
        <Text style={{ 
          position: 'absolute', 
          top: 50, 
          left: 20, 
          color: finalTextColor, 
          fontSize: 12,
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 5
        }}>
          Debug: {finalIsDark ? 'DARK' : 'LIGHT'} - {finalBackgroundColor}
        </Text>
      {/* Logo Image or Fallback Text */}
      {!imageError ? (
        <Image 
          source={finalIsDark ? require('../../assets/splash-dark.png') : require('../../assets/splash-light.png')}
          style={{ 
            width: 200, 
            height: 200, 
            marginBottom: 20,
            resizeMode: 'contain'
          }}
          onError={(error) => {
            console.warn('Failed to load splash image:', error);
            setImageError(true);
          }}
        />
      ) : (
        <View style={{ 
          width: 200, 
          height: 200, 
          marginBottom: 20,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: accentColor,
          borderRadius: 100
        }}>
          <Text style={{ 
            fontSize: 48, 
            fontWeight: 'bold', 
            color: '#ffffff',
            textAlign: 'center'
          }}>
            CS
          </Text>
        </View>
      )}
      
      {/* Loading Indicator */}
      <ActivityIndicator size="large" color={accentColor} />
      
      {/* Loading Text */}
      <Text 
        style={{ 
          marginTop: 16, 
          fontSize: 16, 
          color: finalTextColor,
          textAlign: 'center',
          flexWrap: 'wrap'
        }}
        numberOfLines={0}
      >
        Downloading 100%...
      </Text>
      </View>
    </>
  );
}
