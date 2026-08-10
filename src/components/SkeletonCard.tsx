import React, { memo, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';

const CARD_RADIUS = BORDER_RADIUS.lg; // 16 — match NewsCard
const TITLE_LINE_HEIGHT = TYPOGRAPHY.h3.lineHeight * 1.05; // 29.4
const PREVIEW_LINE_HEIGHT = TYPOGRAPHY.caption.lineHeight * 1.25; // 25
const BONE_RADIUS = 4;
const DEFAULT_COUNT = 5;

interface SkeletonBoneProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  opacity: Animated.Value;
  color: string;
  style?: StyleProp<ViewStyle>;
}

function SkeletonBone({
  width,
  height,
  borderRadius = BONE_RADIUS,
  opacity,
  color,
  style,
}: SkeletonBoneProps) {
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: color,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface SkeletonCardProps {
  opacity: Animated.Value;
}

/**
 * Pixel-matched stand-in for NewsCard: same card chrome, 16:9 image,
 * content padding, and typography line boxes so the FlatList does not
 * jump when real articles replace these placeholders.
 */
export const SkeletonCard = memo(function SkeletonCard({ opacity }: SkeletonCardProps) {
  const { colors, isDark } = useTheme();
  // In dark mode cardBackground and surface are both #1e1e1e — lift bones
  // so they read against the card. In light mode surface (#f5f5f5) works.
  const boneColor = isDark ? '#2c2c2c' : '#e8e8e8';

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: CARD_RADIUS,
      marginBottom: SPACING.md,
      borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...SHADOWS.small,
      overflow: 'hidden',
    },
    imageWrapper: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderTopLeftRadius: CARD_RADIUS,
      borderTopRightRadius: CARD_RADIUS,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    content: {
      padding: SPACING.md,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      // Match category label (12/16) + favorite icon row (~20)
      minHeight: 20,
    },
    sourceRow: {
      marginTop: 2,
      marginBottom: SPACING.xs,
      // Match TYPOGRAPHY.small lineHeight
      minHeight: TYPOGRAPHY.small.lineHeight,
      justifyContent: 'center',
    },
    titleBlock: {
      marginBottom: SPACING.xs,
    },
    titleLine: {
      height: TITLE_LINE_HEIGHT,
      justifyContent: 'center',
    },
    previewBlock: {},
    previewLine: {
      height: PREVIEW_LINE_HEIGHT,
      justifyContent: 'center',
    },
    dateRow: {
      marginTop: SPACING.sm,
      minHeight: TYPOGRAPHY.small.lineHeight,
      justifyContent: 'center',
    },
  });

  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading article"
    >
      <View style={styles.imageWrapper}>
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: boneColor, opacity }]}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.metaRow}>
          <SkeletonBone width="42%" height={12} opacity={opacity} color={boneColor} />
          <SkeletonBone width={20} height={20} borderRadius={4} opacity={opacity} color={boneColor} />
        </View>

        <View style={styles.sourceRow}>
          <SkeletonBone width="36%" height={12} opacity={opacity} color={boneColor} />
        </View>

        <View style={styles.titleBlock}>
          <View style={styles.titleLine}>
            <SkeletonBone width="100%" height={16} opacity={opacity} color={boneColor} />
          </View>
          <View style={styles.titleLine}>
            <SkeletonBone width="92%" height={16} opacity={opacity} color={boneColor} />
          </View>
          <View style={styles.titleLine}>
            <SkeletonBone width="68%" height={16} opacity={opacity} color={boneColor} />
          </View>
        </View>

        <View style={styles.previewBlock}>
          <View style={styles.previewLine}>
            <SkeletonBone width="100%" height={12} opacity={opacity} color={boneColor} />
          </View>
          <View style={styles.previewLine}>
            <SkeletonBone width="78%" height={12} opacity={opacity} color={boneColor} />
          </View>
        </View>

        <View style={styles.dateRow}>
          <SkeletonBone width="28%" height={12} opacity={opacity} color={boneColor} />
        </View>
      </View>
    </View>
  );
});

interface SkeletonFeedProps {
  /** Number of placeholder cards. Default 5 fills a typical phone screen. */
  count?: number;
}

/**
 * Shared opacity pulse across all cards so the feed shimmers in sync.
 * Uses the Animated API with useNativeDriver — no extra deps.
 */
export function SkeletonFeed({ count = DEFAULT_COUNT }: SkeletonFeedProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [opacity]);

  return (
    <View accessible accessibilityLabel="Loading articles" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={`skeleton-${index}`} opacity={opacity} />
      ))}
    </View>
  );
}
