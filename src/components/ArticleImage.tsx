import React, { useState } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../constants';

interface ArticleImageProps {
  imageUrl?: string | null;
  style?: any;
  containerStyle?: any;
  showPlaceholder?: boolean;
}

export const ArticleImage: React.FC<ArticleImageProps> = ({
  imageUrl,
  style,
  containerStyle,
  showPlaceholder = true,
}) => {
  const { colors } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = (error: any) => {
    console.log(`❌ Image failed to load: ${imageUrl}`);
    console.log(`❌ Image error:`, error);
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    console.log(`✅ Image loaded successfully: ${imageUrl}`);
    setImageLoading(false);
  };

  const handleImageLoadStart = () => {
    console.log(`🔄 Starting to load image: ${imageUrl}`);
    setImageLoading(true);
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      ...containerStyle,
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
      ...style,
    },
    placeholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginTop: SPACING.xs,
      textAlign: 'center',
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  // If no image URL or image failed to load, show placeholder
  if (!imageUrl || imageError) {
    if (!showPlaceholder) return null;
    
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.placeholder}>
          <Ionicons name="newspaper-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.placeholderText}>
            {imageError ? 'Image failed to load' : 'No image available'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {imageLoading && (
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={24} color={colors.textSecondary} />
        </View>
      )}
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, style]}
        onError={handleImageError}
        onLoad={handleImageLoad}
        onLoadStart={handleImageLoadStart}
      />
    </View>
  );
};
