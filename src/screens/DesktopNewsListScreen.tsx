import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { NewsCard } from '../components/NewsCard';
import { SearchBar } from '../components/SearchBar';
import { WebAdBanner } from '../components/WebAdBanner';
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

export function DesktopNewsListScreen() {
  const navigation = useNavigation<StackNavigationProp<any, any>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { state, refreshNews, toggleFavorite, favorites, loadMoreNews, getRecentArticles } = useNews();
  const { colors, isDark } = useTheme();
  const { authState } = useSupabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const isDesktop = Platform.OS === 'web' && screenWidth >= 1024;

  // Update screen width on dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // Ensure theme is loaded before rendering
  useEffect(() => {
    if (colors && colors.background) {
      setIsInitialized(true);
    }
  }, [colors]);

  // Handle navigation from Categories screen
  useEffect(() => {
    if (route.params?.selectedCategory) {
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
    
    if (state.isInitialized) {
      loadRecentArticles();
    }
  }, [getRecentArticles, state.isInitialized]);

  const filteredArticles = useMemo(() => {
    const articlesToSearch = recentArticles.length > 0 ? recentArticles : state.articles;
    
    if (!searchQuery.trim()) {
      return articlesToSearch;
    }
    
    const query = searchQuery.toLowerCase();
    return articlesToSearch.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.summary.toLowerCase().includes(query) ||
      article.source.toLowerCase().includes(query)
    );
  }, [searchQuery, recentArticles, state.articles]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNews();
    setRefreshing(false);
  }, [refreshNews]);

  const handleToggleFavorite = useCallback((articleId: string) => {
    toggleFavorite(articleId);
  }, [toggleFavorite]);

  const renderArticle = useCallback(({ item }: { item: ProcessedArticle }) => {
    const isFavorite = favorites.includes(item.id);
    
    const card = (
      <NewsCard
        article={item}
        onPress={() => {
          navigation.navigate('ArticleDetail', { 
            article: item,
            isFavorite
          });
        }}
        onToggleFavorite={() => handleToggleFavorite(item.id)}
        isFavorite={isFavorite}
      />
    );

    if (isDesktop) {
      return (
        <View style={styles.desktopCardWrapper}>
          {card}
        </View>
      );
    }

    return card;
  }, [navigation, handleToggleFavorite, favorites, isDesktop]);

  const keyExtractor = useCallback((item: ProcessedArticle) => item.id, []);

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

    if (searchQuery.trim() && filteredArticles.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No articles found matching "{searchQuery}"
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>
          No cybersecurity news available at the moment.
        </Text>
      </View>
    );
  }, [state.loading, state.error, searchQuery, filteredArticles.length, colors.accent]);

  const renderHeader = useCallback(() => {
    return (
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Latest Cybersecurity News</Text>
          <Text style={styles.subtitle}>Stay informed with the latest security threats and protection tips</Text>
        </View>

        <SearchBar 
          value={searchQuery} 
          onChangeText={setSearchQuery}
          placeholder="Search news..."
        />
      </View>
    );
  }, [searchQuery]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    desktopLayout: {
      flex: 1,
      flexDirection: 'row',
    },
    desktopMainContent: {
      flex: 1,
      paddingRight: 20,
    },
    desktopSidebar: {
      width: 200,
      paddingLeft: 20,
    },
    listContainer: {
      padding: isDesktop ? SPACING.lg : SPACING.md,
      maxWidth: isDesktop ? 1200 : undefined,
      marginHorizontal: isDesktop ? 'auto' : 0,
    },
    desktopGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    desktopCardWrapper: {
      width: isDesktop ? '48%' : '100%',
      marginBottom: SPACING.md,
    },
    header: {
      marginBottom: SPACING.lg,
    },
    titleContainer: {
      marginBottom: SPACING.md,
    },
    title: {
      ...TYPOGRAPHY.h1,
      color: colors.textPrimary,
      marginBottom: SPACING.xs,
      textAlign: 'center',
    },
    subtitle: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: SPACING.md,
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
    },
    emptyStateText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
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
    lastUpdated: {
      ...TYPOGRAPHY.caption,
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: SPACING.sm,
    },
  });

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Desktop layout with sidebar ads
  if (isDesktop) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.desktopLayout}>
          {/* Main content */}
          <View style={styles.desktopMainContent}>
            <FlatList
              data={filteredArticles}
              renderItem={renderArticle}
              keyExtractor={keyExtractor}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={renderEmptyState}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={[styles.listContainer, styles.desktopGrid]}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={21}
              initialNumToRender={10}
              onEndReached={loadMoreNews}
              onEndReachedThreshold={0.5}
              numColumns={2}
              key={2}
              ListFooterComponent={() => (
                <View style={{ paddingVertical: SPACING.lg, alignItems: 'center', width: '100%' }}>
                  {state.loadingMore && (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: SPACING.md }} />
                  )}
                  <Text style={styles.lastUpdated}>
                    Last updated: {state.lastUpdated ? state.lastUpdated.toLocaleTimeString() : 'Never'}
                  </Text>
                  <Text style={styles.lastUpdated}>
                    Showing {filteredArticles.length} of {state.totalArticles || 0} articles
                  </Text>
                  {!state.hasMore && state.totalArticles > 0 && (
                    <Text style={[styles.lastUpdated, { color: colors.textSecondary, fontStyle: 'italic', marginTop: SPACING.sm }]}>
                      No more articles to load
                    </Text>
                  )}
                  {state.error && (
                    <Text style={[styles.lastUpdated, { color: colors.error || '#ff4444', marginTop: SPACING.sm }]}>
                      ⚠️ {state.error}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>
          
          {/* Right sidebar with ads */}
          <View style={styles.desktopSidebar}>
            <WebAdBanner size="skyscraper" position="sidebar" />
            <WebAdBanner size="banner" position="sidebar" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Mobile layout (fallback)
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredArticles}
        renderItem={renderArticle}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
              <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: SPACING.md }} />
            )}
            <Text style={styles.lastUpdated}>
              Last updated: {state.lastUpdated ? state.lastUpdated.toLocaleTimeString() : 'Never'}
            </Text>
            <Text style={styles.lastUpdated}>
              Showing {filteredArticles.length} of {state.totalArticles || 0} articles
            </Text>
            {!state.hasMore && state.totalArticles > 0 && (
              <Text style={[styles.lastUpdated, { color: colors.textSecondary, fontStyle: 'italic', marginTop: SPACING.sm }]}>
                No more articles to load
              </Text>
            )}
            {state.error && (
              <Text style={[styles.lastUpdated, { color: colors.error || '#ff4444', marginTop: SPACING.sm }]}>
                ⚠️ {state.error}
              </Text>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
