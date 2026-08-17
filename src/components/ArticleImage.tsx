import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Text,
  type ImageResizeMode,
  type StyleProp,
  type ViewStyle,
  type ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../constants';

interface ArticleImageProps {
  imageUrl?: string | null;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  showPlaceholder?: boolean;
  /**
   * Passed to the native Image as a prop rather than a style entry. Setting it
   * through `style` is unreliable once styles are merged, which left remote
   * images stretching to their container instead of filling it.
   */
  resizeMode?: ImageResizeMode;
  placeholderIconSize?: number;
  /** Placeholder caption is noise in small thumbnails. */
  showPlaceholderText?: boolean;
  /**
   * Rendered in place of the generic placeholder when there is no artwork, so
   * a caller can fill the slot with something meaningful (a category tile)
   * rather than leaving a blank grey box. Also used when a remote image 404s.
   */
  fallback?: React.ReactNode;
}

export const ArticleImage: React.FC<ArticleImageProps> = ({
  imageUrl,
  style,
  containerStyle,
  showPlaceholder = true,
  resizeMode = 'cover',
  placeholderIconSize = 48,
  showPlaceholderText = true,
  fallback,
}) => {
  const { colors } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      // The container always clips, so a `cover` image can never bleed past the
      // rounded corners of whichever card is hosting it.
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginTop: SPACING.xs,
      textAlign: 'center',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (!imageUrl || imageError) {
    if (fallback) {
      return <View style={[styles.container, containerStyle]}>{fallback}</View>;
    }

    if (!showPlaceholder) return null;

    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.placeholder}>
          <Ionicons
            name="newspaper-outline"
            size={placeholderIconSize}
            color={colors.textSecondary}
          />
          {showPlaceholderText && (
            <Text style={styles.placeholderText}>
              {imageError ? 'Image failed to load' : 'No image available'}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, style]}
        resizeMode={resizeMode}
        onError={handleImageError}
        onLoad={handleImageLoad}
        onLoadStart={() => setImageLoading(true)}
      />

      {imageLoading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <Ionicons
            name="image-outline"
            size={Math.min(placeholderIconSize, 24)}
            color={colors.textSecondary}
          />
        </View>
      )}
    </View>
  );
};
