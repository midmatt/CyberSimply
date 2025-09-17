import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NewsCard } from '../components/NewsCard';
import { SearchBar } from '../components/SearchBar';
import { useNews } from '../context/NewsContext';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { ProcessedArticle } from '../services/newsService';
import { TYPOGRAPHY, SPACING } from '../constants';
import { formatTextForDisplay } from '../utils/textUtils';

// Use the unified category type
type NewsCategory = 'all';

// Define navigation types
type RootStackParamList = {
  Main: undefined;
  ArticleDetail: { article: ProcessedArticle; isFavorite: boolean };
};

type TabParamList = {
  News: { selectedCategory?: NewsCategory } | undefined;
  Categories: undefined;
  Favorites: undefined;
  Settings: undefined;
};

type NavigationProp = {
  navigate: (screen: keyof RootStackParamList, params?: any) => void;
};

type RouteParams = {
  selectedCategory?: NewsCategory;
};

export function NewsListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { state, refreshNews, toggleFavorite, favorites, loadMoreNews, getRecentArticles } = useNews();
  const { colors, isDark } = useTheme();
  const { authState } = useSupabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Ensure theme is loaded before rendering
  useEffect(() => {
    if (colors && colors.background) {
      setIsInitialized(true);
    }
  }, [colors]);

  // Search functionality is now handled directly by setSearchQuery

  // Handle navigation from Categories screen
  useEffect(() => {
    if (route.params?.selectedCategory) {
      // For now, just ignore category selection since we're using search
      console.log('Category selection ignored - using search instead');
    }
  }, [route.params?.selectedCategory]);

  // Get recent articles (within the last week)
  const [recentArticles, setRecentArticles] = useState<ProcessedArticle[]>([]);
  
  useEffect(() => {
    const loadRecentArticles = async () => {
      try {
        const articles = await getRecentArticles();
        setRecentArticles(articles);
      } catch (error) {
        console.error('Failed to load recent articles:', error);
        setRecentArticles([]);
      }
    };
    
    // Only load articles after initialization is complete
    if (state.isInitialized) {
      loadRecentArticles();
    }
  }, [getRecentArticles, state.isInitialized]);

  const filteredArticles = useMemo(() => {
    // Use recentArticles if available, otherwise fall back to state.articles
    const articlesToSearch = recentArticles.length > 0 ? recentArticles : state.articles;
    
    if (!searchQuery.trim()) {
      return articlesToSearch;
    }
    
    const query = searchQuery.toLowerCase();
    return articlesToSearch.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.summary.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query)
    );
  }, [searchQuery, recentArticles, state.articles]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNews();
    setRefreshing(false);
  }, [refreshNews]);

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

  const handleLoadMore = useCallback(() => {
    if (!state.loadingMore && state.hasMore) {
      loadMoreNews();
    }
  }, [state.loadingMore, state.hasMore, loadMoreNews]);

  const handleProfilePress = () => {
    navigation.navigate('Profile' as never);
  };

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
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    logoContainer: {
      alignItems: 'center',
    },
    headerLogo: {
      width: 80,
      height: 80,
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
    categoryContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: SPACING.md,
    },
    categoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      marginRight: SPACING.sm,
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedCategoryButton: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    categoryButtonText: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginLeft: SPACING.xs,
    },
    selectedCategoryButtonText: {
      color: colors.cardBackground,
      fontWeight: '600',
    },
    listContainer: {
      padding: SPACING.md,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      marginTop: SPACING.md,
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
    },
    emptyStateText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
    },
    errorTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.error,
      marginBottom: SPACING.sm,
    },
    errorMessage: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    loadMoreButton: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: 8,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACING.md,
    },
    loadMoreText: {
      ...TYPOGRAPHY.button,
      color: colors.accent,
    },
    lastUpdated: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginTop: SPACING.sm,
    },
    footerContainer: {
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerInfo: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginTop: SPACING.sm,
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
    if (state.loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading cybersecurity news...</Text>
        </View>
      );
    }

    if (state.error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{state.error}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>
          {searchQuery.trim() 
            ? `No articles found for "${searchQuery}". Try a different search term.`
            : 'No cybersecurity news available at the moment.'
          }
        </Text>
      </View>
    );
  }, [state.loading, state.error, searchQuery, colors.accent]);

  const renderFooter = useCallback(() => {
    return (
      <View style={styles.footerContainer}>
        {state.hasMore && (
          <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
            <Text style={styles.loadMoreText}>
              {state.loadingMore ? 'Loading...' : 'Load More Articles'}
            </Text>
          </TouchableOpacity>
        )}
        
      </View>
    );
  }, [state.hasMore, state.loadingMore, state.lastUpdated, handleLoadMore, colors.accent, filteredArticles.length]);

  const keyExtractor = useCallback((item: ProcessedArticle) => item.id, []);

  // Show loading screen while theme initializes
  if (!isInitialized) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#333333' }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Image 
              source={isDark 
                ? require('../../assets/icons/In App Dark Icon.png')
                : require('../../assets/icons/ios-light.png')
              }
              style={styles.headerLogo}
              resizeMode="contain"
            />
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
        
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search news..."
        />

      </View>

      <FlatList
        data={filteredArticles}
        renderItem={renderArticle}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={5}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
      />
    </SafeAreaView>
  );
}
