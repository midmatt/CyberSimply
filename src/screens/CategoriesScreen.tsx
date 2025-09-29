import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useNews } from '../context/NewsContext';
import { useSupabase } from '../context/SupabaseContext';
import { ArticleCategory } from '../types';
import { AdBanner } from '../components/AdBanner';
import { PinnedBannerAd } from '../components/PinnedBannerAd';

// Use the unified category type
type NewsCategory = 'cybersecurity' | 'hacking' | 'general' | 'all';

interface Category {
  id: NewsCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  articleCount: number;
}

// Define navigation types
type RootStackParamList = {
  Main: undefined;
  ArticleDetail: { article: any; isFavorite: boolean };
  CategoryArticles: { category: Category };
};

type NavigationProp = {
  navigate: (screen: keyof RootStackParamList, params?: any) => void;
};

export function CategoriesScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { state, getCategoryCounts } = useNews();
  const { authState } = useSupabase();
  const [categories, setCategories] = useState<Category[]>([]);

  // Initialize categories with actual article counts from Supabase
  useEffect(() => {
    const updateCategoriesWithCounts = () => {
      const updatedCategories: Category[] = [
        {
          id: 'cybersecurity',
          name: 'Cybersecurity',
          description: 'Security best practices, vulnerabilities, and protection tips',
          icon: 'shield-checkmark',
          color: '#4CAF50',
          articleCount: state.categoryCounts.cybersecurity
        },
        {
          id: 'hacking',
          name: 'Hacking & Exploits',
          description: 'Hacking techniques, exploits, and cyber attacks',
          icon: 'warning',
          color: '#FF5722',
          articleCount: state.categoryCounts.hacking
        },
        {
          id: 'general',
          name: 'General Tech',
          description: 'General technology and cybersecurity news',
          icon: 'newspaper',
          color: '#9C27B0',
          articleCount: state.categoryCounts.general
        }
      ];

      setCategories(updatedCategories);
    };

    // Update categories when counts change
    updateCategoriesWithCounts();
  }, [state.categoryCounts]);

  // Load category counts when component mounts
  useEffect(() => {
    if (state.isInitialized) {
      getCategoryCounts();
    }
  }, [state.isInitialized, getCategoryCounts]);

  const handleCategoryPress = (category: Category) => {
    // Navigate to CategoryArticles screen instead of News tab
    navigation.navigate('CategoryArticles', { category });
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile' as never);
  };

  const renderCategoryCard = (category: Category) => (
    <TouchableOpacity
      key={category.id}
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(category)}
    >
      <View style={styles.categoryHeader}>
        <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
          <Ionicons
            name={category.icon as any}
            size={32}
            color={category.color}
          />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categoryDescription}>{category.description}</Text>
        </View>
        <View style={styles.arrowContainer}>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={colors.textSecondary}
          />
        </View>
      </View>
      
      <View style={styles.categoryFooter}>
        <Text style={styles.articleCount}>
          {category.articleCount} articles
        </Text>
        <Text style={styles.tapToView}>Tap to view articles</Text>
      </View>
    </TouchableOpacity>
  );

  // Create styles with access to colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    title: {
      ...TYPOGRAPHY.h1,
      color: colors.textPrimary, // Use theme-aware text color
      marginBottom: SPACING.xs,
    },
    subtitle: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary, // Use theme-aware secondary text color
    },
    profileButton: {
      padding: SPACING.xs,
    },
    profileImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    profilePlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    scrollContent: {
      padding: SPACING.md,
      paddingBottom: SPACING.xl * 2, // Add extra bottom padding for footer
    },
    categoryCard: {
      backgroundColor: colors.cardBackground, // Use theme-aware card background
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      ...SHADOWS.medium,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: BORDER_RADIUS.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    categoryInfo: {
      flex: 1,
    },
    categoryName: {
      ...TYPOGRAPHY.h3,
      color: colors.textPrimary, // Use theme-aware text color
      marginBottom: SPACING.xs,
    },
    categoryDescription: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary, // Use theme-aware secondary text color
      lineHeight: TYPOGRAPHY.body.lineHeight * 1.2,
    },
    arrowContainer: {
      padding: SPACING.xs,
    },
    categoryFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    articleCount: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary, // Use theme-aware secondary text color
    },
    tapToView: {
      ...TYPOGRAPHY.caption,
      color: colors.info, // Use theme-aware info color
      fontWeight: '600',
    },
    infoSection: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.info + '10',
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginTop: SPACING.lg,
    },
    infoText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary, // Use theme-aware secondary text color
      marginLeft: SPACING.sm,
      flex: 1,
      lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Categories</Text>
            <Text style={styles.subtitle}>
              Browse cybersecurity news by topic
            </Text>
          </View>
          
          <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
            {authState.user?.avatarUrl ? (
              <Image 
                source={{ uri: authState.user.avatarUrl }} 
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Ionicons 
                  name="person" 
                  size={20} 
                  color={colors.textSecondary} 
                />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {categories.map(renderCategoryCard)}
        
        {/* Ad Banner after categories */}
        <AdBanner size="medium" showCloseButton={true} />
        
        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={24} color={colors.info} />
          <Text style={styles.infoText}>
            Select a category to view related cybersecurity news and articles.
          </Text>
        </View>
      </ScrollView>
      
      {/* Pinned Banner Ad at bottom */}
      <PinnedBannerAd />
    </SafeAreaView>
  );
}
