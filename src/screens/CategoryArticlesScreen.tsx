import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NewsCard } from '../components/NewsCard';
import { SearchBar } from '../components/SearchBar';
import { useNews } from '../context/NewsContext';
import { useTheme } from '../context/ThemeContext';
import { ProcessedArticle } from '../services/newsService';
import { TYPOGRAPHY, SPACING } from '../constants';
import { ArticleCategory } from '../types';

// Category interface matching CategoriesScreen
interface Category {
  id: ArticleCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  articleCount: number;
}

// Define navigation types
type RootStackParamList = {
  Main: undefined;
  ArticleDetail: { article: ProcessedArticle; isFavorite: boolean };
  CategoryArticles: { category: Category };
};

type NavigationProp = {
  navigate: (screen: keyof RootStackParamList, params?: any) => void;
  goBack: () => void;
};

type RouteParams = {
  category: Category;
};

export function CategoryArticlesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { state, toggleFavorite, favorites } = useNews();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { category } = route.params;

  // Filter articles by category
  const categoryArticles = useMemo(() => {
    let filtered: ProcessedArticle[] = [];

    switch (category.id) {
      case 'Security Basics':
        filtered = state.articles.filter(article => 
          article.category === 'cybersecurity' && 
          (article.title.toLowerCase().includes('security') || 
           article.summary.toLowerCase().includes('security') ||
           article.title.toLowerCase().includes('protection') ||
           article.summary.toLowerCase().includes('protection'))
        );
        break;
      case 'Major Breaches':
        filtered = state.articles.filter(article => 
          article.title.toLowerCase().includes('breach') || 
          article.summary.toLowerCase().includes('breach') ||
          article.title.toLowerCase().includes('attack') ||
          article.summary.toLowerCase().includes('attack') ||
          article.title.toLowerCase().includes('hack') ||
          article.summary.toLowerCase().includes('hack')
        );
        break;
      case 'Scams to Avoid':
        filtered = state.articles.filter(article => 
          article.title.toLowerCase().includes('scam') || 
          article.summary.toLowerCase().includes('scam') ||
          article.title.toLowerCase().includes('phish') ||
          article.summary.toLowerCase().includes('phish') ||
          article.title.toLowerCase().includes('fraud') ||
          article.summary.toLowerCase().includes('fraud')
        );
        break;
      default:
        filtered = [];
    }

    return filtered;
  }, [state.articles, category.id]);

  // Filter articles based on search query within the category
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) {
      return categoryArticles;
    }
    
    const query = searchQuery.toLowerCase();
    return categoryArticles.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.summary.toLowerCase().includes(query) ||
      article.what.toLowerCase().includes(query) ||
      article.impact.toLowerCase().includes(query) ||
      article.takeaways.toLowerCase().includes(query)
    );
  }, [searchQuery, categoryArticles]);

  const handleArticlePress = useCallback((article: ProcessedArticle) => {
    // Navigate to article detail with the article data
    navigation.navigate('ArticleDetail', { 
      article: article,
      isFavorite: favorites.includes(article.id)
    });
  }, [navigation, favorites]);

  const handleToggleFavorite = useCallback((articleId: string) => {
    toggleFavorite(articleId);
  }, [toggleFavorite]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Create styles with access to colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.md,
      paddingVertical: SPACING.xs,
    },
    backText: {
      ...TYPOGRAPHY.button,
      color: colors.accent,
      marginLeft: SPACING.xs,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    title: {
      ...TYPOGRAPHY.h1,
      color: colors.textPrimary,
      flex: 1,
    },
    subtitle: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      marginBottom: SPACING.sm,
    },
    articleCount: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginBottom: SPACING.md,
    },
    listContainer: {
      padding: SPACING.md,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
      minHeight: 300,
    },
    emptyStateTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.textPrimary,
      marginTop: SPACING.md,
      marginBottom: SPACING.sm,
      textAlign: 'center',
    },
    emptyStateText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
    },
  });

  const renderArticle = useCallback(({ item }: { item: ProcessedArticle }) => (
    <NewsCard
      article={item}
      onPress={handleArticlePress}
      onToggleFavorite={handleToggleFavorite}
      isFavorite={favorites.includes(item.id)}
    />
  ), [handleArticlePress, handleToggleFavorite, favorites]);

  const renderEmptyState = useCallback(() => {
    return (
      <View style={styles.emptyState}>
        <Ionicons 
          name={category.icon as any} 
          size={64} 
          color={colors.textSecondary} 
        />
        <Text style={styles.emptyStateTitle}>
          {searchQuery.trim() 
            ? `No "${category.name}" articles found`
            : `No ${category.name} articles yet`
          }
        </Text>
        <Text style={styles.emptyStateText}>
          {searchQuery.trim() 
            ? `No articles found for "${searchQuery}" in the ${category.name} category. Try a different search term.`
            : `Articles related to ${category.description.toLowerCase()} will appear here as they become available.`
          }
        </Text>
      </View>
    );
  }, [searchQuery, category, colors.textSecondary]);

  const keyExtractor = useCallback((item: ProcessedArticle) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
          <Text style={styles.backText}>Categories</Text>
        </TouchableOpacity>

        <View style={styles.categoryHeader}>
          <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
            <Ionicons
              name={category.icon as any}
              size={28}
              color={category.color}
            />
          </View>
          <Text style={styles.title}>{category.name}</Text>
        </View>

        <Text style={styles.subtitle}>{category.description}</Text>
        <Text style={styles.articleCount}>
          {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
          {searchQuery.trim() && ` for "${searchQuery}"`}
        </Text>
        
        <SearchBar
          onSearch={setSearchQuery}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Search in ${category.name}...`}
        />
      </View>

      <FlatList
        data={filteredArticles}
        renderItem={renderArticle}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={5}
      />
    </SafeAreaView>
  );
}

