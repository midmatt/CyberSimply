import React, { memo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { BORDER_RADIUS } from '../constants';
import { getCategoryColor, type ArticleCategoryKind } from '../utils/articleCategory';

interface CategoryTagProps {
  kind: ArticleCategoryKind;
  label: string;
  style?: StyleProp<ViewStyle>;
}

export const CategoryTag = memo(function CategoryTag({ kind, label, style }: CategoryTagProps) {
  const { colors, isDark } = useTheme();
  const color = getCategoryColor(kind, colors);
  // Hex alpha keeps the fill tied to the text colour without a second token.
  const background = `${color}${isDark ? '2E' : '1A'}`;

  return (
    <View style={[styles.tag, { backgroundColor: background }, style]}>
      <Text style={[styles.label, { color }]} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
