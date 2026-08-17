import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../constants';
import {
  getCategoryColor,
  type ArticleCategoryMeta,
} from '../utils/articleCategory';

const ACCENT_WIDTH = 4;
const ICON_SIZE = 40;

interface CategoryCardProps {
  category: ArticleCategoryMeta;
  count: number;
  onPress: (category: ArticleCategoryMeta) => void;
}

export const CategoryCard = memo(function CategoryCard({
  category,
  count,
  onPress,
}: CategoryCardProps) {
  const { colors, isDark } = useTheme();
  const accent = getCategoryColor(category.kind, colors);

  const styles = StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.cardBackground,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm + 2,
      borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
      borderColor: colors.border,
      // Clips the accent bar to the rounded corners and stops the card from
      // painting outside its own bounds.
      overflow: 'hidden',
    },
    pressed: {
      opacity: 0.7,
    },
    // Stretches to the card's height because the row has no alignItems override.
    accent: {
      width: ACCENT_WIDTH,
      backgroundColor: accent,
    },
    body: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.md - 2,
    },
    iconBadge: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: `${accent}${isDark ? '2E' : '1A'}`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.sm + 2,
    },
    text: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    name: {
      ...TYPOGRAPHY.body,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
    },
    count: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      fontWeight: '600',
      marginHorizontal: SPACING.sm,
    },
    description: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginTop: 1,
    },
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onPress(category)}
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${count} article${count === 1 ? '' : 's'}`}
    >
      <View style={styles.accent} />

      <View style={styles.body}>
        <View style={styles.iconBadge}>
          <Ionicons name={category.icon as any} size={20} color={accent} />
        </View>

        <View style={styles.text}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
              {category.name}
            </Text>

            <Text style={styles.count}>{count}</Text>

            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>

          <Text style={styles.description} numberOfLines={1} ellipsizeMode="tail">
            {category.description}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});
