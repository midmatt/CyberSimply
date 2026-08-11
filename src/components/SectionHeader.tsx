import React, { memo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../constants';

interface SectionHeaderProps {
  title: string;
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader = memo(function SectionHeader({
  title,
  count,
  style,
}: SectionHeaderProps) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      ...TYPOGRAPHY.h4,
      color: colors.textPrimary,
      // Let a long section title shrink rather than push the badge off-screen.
      flexShrink: 1,
    },
    badge: {
      marginLeft: SPACING.sm,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    badgeText: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });

  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>

      {typeof count === 'number' && count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
});
