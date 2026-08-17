import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ArticleCategory } from '../types';
import { CATEGORIES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';

// Extend ArticleCategory to include 'all'
type ExtendedCategory = ArticleCategory | 'all';

interface CategoryListProps {
  selectedCategory: ExtendedCategory;
  onSelectCategory: (category: ExtendedCategory) => void;
}

export function CategoryList({ selectedCategory, onSelectCategory }: CategoryListProps) {
  const { colors } = useTheme();

  const getIconName = (iconName: string) => {
    switch (iconName) {
      case 'shield-outline': return 'shield-outline';
      case 'lock-closed': return 'lock-closed';
      case 'warning': return 'warning';
      case 'shield-checkmark': return 'shield-checkmark';
      default: return 'shield';
    }
  };

  // Create styles with access to colors
  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    categoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      marginRight: SPACING.sm,
      ...SHADOWS.small,
    },
    selectedCategoryButton: {
      backgroundColor: colors.accent,
    },
    categoryButtonText: {
      ...TYPOGRAPHY.caption,
      marginLeft: SPACING.xs,
      color: colors.textSecondary,
    },
    selectedCategoryButtonText: {
      color: colors.cardBackground,
      fontWeight: '600',
    },
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[
          styles.categoryButton,
          selectedCategory === 'all' && styles.selectedCategoryButton,
        ]}
        onPress={() => onSelectCategory('all')}
      >
        <Ionicons
          name="grid-outline"
          size={20}
          color={selectedCategory === 'all' ? colors.cardBackground : colors.textSecondary}
        />
        <Text
          style={[
            styles.categoryButtonText,
            selectedCategory === 'all' && styles.selectedCategoryButtonText,
          ]}
        >
          All
        </Text>
      </TouchableOpacity>
      {CATEGORIES.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryButton,
            selectedCategory === category.name && styles.selectedCategoryButton,
          ]}
          onPress={() => onSelectCategory(category.name as ArticleCategory)}
        >
          <Ionicons
            name={getIconName(category.icon)}
            size={20}
            color={selectedCategory === category.name ? colors.cardBackground : colors.textSecondary}
          />
          <Text
            style={[
              styles.categoryButtonText,
              selectedCategory === category.name && styles.selectedCategoryButtonText,
            ]}
          >
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
