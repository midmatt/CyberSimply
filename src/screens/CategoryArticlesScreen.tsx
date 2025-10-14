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
  const navigation = useNavigation();
  const route = useRoute();
  const { state, toggleFavorite, favorites, switchToCategory, loadMoreNews } = useNews();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { category } = route.params;

  // Load category articles when component mounts
  useEffect(() => {
    console.log(`CategoryArticlesScreen: Loading articles for category: ${category.id}`);
    switchToCategory(category.id);
  }, [category.id, switchToCategory]);

  // Use articles from state (which are filtered by category)
  // Additional client-side filtering to ensure we only show articles for this specific category
  const categoryArticles = state.articles.filter(article => 
    article.category === category.id || 
    (category.id === 'general' && (!article.category || article.category === 'general'))
  );

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
    loadingText: {
      ...TYPOGRAPHY.body,
      marginBottom: SPACING.sm,
    },
    footerText: {
      ...TYPOGRAPHY.caption,
      textAlign: 'center',
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
        maxToRenderPerBatch={10}
        windowSize={21}
        initialNumToRender={10}
        onEndReached={loadMoreNews}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => (
          <View style={{ paddingVertical: SPACING.lg, alignItems: 'center' }}>
            {state.loadingMore && (
              <Text style={[styles.emptyStateText, { color: colors.primary }]}>
                Loading more articles...
              </Text>
            )}
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Showing {filteredArticles.length} of {state.totalArticles || 0} articles
            </Text>
            {!state.hasMore && state.totalArticles > 0 && (
              <Text style={[styles.footerText, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                No more articles to load
              </Text>
            )}
            {state.error && (
              <Text style={[styles.loadingText, { color: colors.error || '#ff4444' }]}>
                ⚠️ {state.error}
              </Text>
            )}
          </View>
        )}
      />
      
      {/* Pinned Banner Ad at bottom */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  backText: {
    ...TYPOGRAPHY.body,
    marginLeft: SPACING.xs,
    color: '#007AFF',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h2,
    flex: 1,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: '#666',
    marginBottom: SPACING.xs,
  },
  articleCount: {
    ...TYPOGRAPHY.caption,
    color: '#999',
  },
  searchContainer: {
    padding: SPACING.md,
  },
  listContainer: {
    padding: SPACING.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyStateTitle: {
    ...TYPOGRAPHY.h3,
    textAlign: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  emptyStateText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.sm,
  },
  footerText: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
  },
});

