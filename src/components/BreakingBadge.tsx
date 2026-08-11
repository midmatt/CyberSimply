import React, { memo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BORDER_RADIUS } from '../constants';
import { getBreakingLabel } from '../utils/breakingNews';

interface BreakingBadgeProps {
  /** breaking_category from the article row, if known. */
  category?: string | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * Marks a severe, just-happened event. Unlike CategoryTag this is a solid fill
 * rather than a tint, so a breaking story is unmistakable at a glance even next
 * to a coral "Breach" tag — the two can appear on the same card.
 */
export const BreakingBadge = memo(function BreakingBadge({ category, style }: BreakingBadgeProps) {
  const { colors } = useTheme();
  const qualifier = getBreakingLabel(category);

  return (
    <View
      style={[styles.badge, { backgroundColor: colors.error }, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={qualifier ? `Breaking news: ${qualifier}` : 'Breaking news'}
    >
      <Ionicons name="flash" size={11} color={colors.white} style={styles.icon} />
      <Text style={[styles.label, { color: colors.white }]} numberOfLines={1}>
        {qualifier ? `BREAKING · ${qualifier}` : 'BREAKING'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  icon: {
    marginRight: 3,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
