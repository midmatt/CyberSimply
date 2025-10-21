import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAdFree } from '../context/AdFreeContext';

interface WebAdBannerProps {
  position?: 'top' | 'bottom' | 'inline' | 'sidebar';
  size?: 'banner' | 'large' | 'medium' | 'small' | 'skyscraper';
  onAdPress?: () => void;
  showCloseButton?: boolean;
}

export function WebAdBanner({ 
  position = 'inline', 
  size = 'banner',
  onAdPress,
  showCloseButton = false 
}: WebAdBannerProps) {
  const { colors } = useTheme();
  const { isAdFree } = useAdFree();
  const [isVisible, setIsVisible] = useState(true);

  // Don't render if user has ad-free access
  if (isAdFree) {
    return null;
  }

  // Don't render on mobile platforms
  if (Platform.OS !== 'web') {
    return null;
  }

  const handleAdPress = () => {
    if (onAdPress) {
      onAdPress();
    } else {
      // Default behavior - open cybersecurity resource
      window.open('https://www.cisa.gov/cybersecurity', '_blank');
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const getAdContent = () => {
    const adContents = [
      {
        title: "Cybersecurity Training",
        description: "Learn advanced security techniques",
        cta: "Learn More",
        icon: "shield-checkmark"
      },
      {
        title: "Security Tools",
        description: "Professional security software",
        cta: "Explore",
        icon: "tools"
      },
      {
        title: "Threat Intelligence",
        description: "Real-time threat monitoring",
        cta: "Get Started",
        icon: "analytics"
      }
    ];
    
    return adContents[Math.floor(Math.random() * adContents.length)];
  };

  const adContent = getAdContent();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginVertical: 8,
      position: 'relative',
    },
    adContent: {
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    adIcon: {
      marginRight: 12,
    },
    adText: {
      flex: 1,
    },
    adTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accent,
      marginBottom: 4,
    },
    adDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    ctaButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      marginLeft: 8,
    },
    ctaText: {
      fontSize: 12,
      color: '#ffffff',
      fontWeight: '600',
    },
    closeButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      padding: 4,
    },
    adLabel: {
      position: 'absolute',
      top: 0,
      left: 0,
      backgroundColor: colors.accent,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderBottomRightRadius: 6,
    },
    adLabelText: {
      fontSize: 10,
      color: '#ffffff',
      fontWeight: '600',
    },
    // Size variations
    banner: {
      minHeight: 60,
    },
    large: {
      minHeight: 90,
    },
    medium: {
      minHeight: 75,
    },
    small: {
      minHeight: 50,
    },
    skyscraper: {
      minHeight: 250,
      width: 160,
    },
  });

  if (!isVisible) {
    return null;
  }

  return (
    <View style={[styles.container, styles[size]]}>
      <View style={styles.adLabel}>
        <Text style={styles.adLabelText}>AD</Text>
      </View>
      
      {showCloseButton && (
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.adContent} onPress={handleAdPress}>
        <View style={styles.adIcon}>
          <Ionicons name={adContent.icon as any} size={24} color={colors.accent} />
        </View>
        
        <View style={styles.adText}>
          <Text style={styles.adTitle}>{adContent.title}</Text>
          <Text style={styles.adDescription}>{adContent.description}</Text>
        </View>

        <View style={styles.ctaButton}>
          <Text style={styles.ctaText}>{adContent.cta}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
