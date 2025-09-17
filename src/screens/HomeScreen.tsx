import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { NewsCard } from '../components/NewsCard';
import { SearchBar } from '../components/SearchBar';
import { AdBanner } from '../components/AdBanner';
import { useNews } from '../context/NewsContext';
import { useTheme } from '../context/ThemeContext';
import { ProcessedArticle } from '../services/newsService';
import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const { state: newsState, refreshNews, getRecentArticles } = useNews();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Create styles with access to colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContainer: {
      padding: SPACING.md,
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
    aiStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACING.sm,
      padding: SPACING.sm,
      backgroundColor: colors.accent + '20',
      borderRadius: 8,
    },
    aiStatusText: {
      ...TYPOGRAPHY.caption,
      color: colors.accent,
      marginLeft: SPACING.xs,
    },
    lastUpdated: {
      ...TYPOGRAPHY.caption,
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: SPACING.sm,
    },
  });
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNews();
    setRefreshing(false);
  }, [refreshNews]);

  // Search functionality is now handled directly by setSearchQuery

  const handleToggleFavorite = useCallback((articleId: string) => {
    // Handle favorites if needed
    console.log('Toggle favorite:', articleId);
  }, []);

  // Get recent articles (within the last week)
  const [recentArticles, setRecentArticles] = useState<ProcessedArticle[]>([]);
  
  useEffect(() => {
    const loadRecentArticles = async () => {
      try {
        console.log('HomeScreen: Loading recent articles...');
        const articles = await getRecentArticles();
        setRecentArticles(articles);
        console.log(`HomeScreen: Loaded ${articles.length} recent articles`);
        console.log('HomeScreen: Articles data:', articles.slice(0, 2)); // Log first 2 articles for debugging
      } catch (error) {
        console.error('Failed to load recent articles:', error);
        setRecentArticles([]);
      }
    };
    
    // Only load articles after initialization is complete
    if (newsState.isInitialized) {
      console.log('HomeScreen: Initialization complete, loading recent articles');
      loadRecentArticles();
    } else {
      console.log('HomeScreen: Waiting for initialization...');
    }
  }, [getRecentArticles, newsState.isInitialized]);

  // Filter articles based on search query
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) {
      return recentArticles;
    }
    
    const query = searchQuery.toLowerCase();
    return recentArticles.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.summary.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query)
    );
  }, [searchQuery, recentArticles]);

  const renderArticle = useCallback(({ item }: { item: ProcessedArticle }) => {
    return (
      <NewsCard
        article={item}
        onPress={() => {
          // Navigate to article detail without passing functions
          navigation.navigate('ArticleDetail', { 
            article: item,
            isFavorite: false
          });
        }}
        onToggleFavorite={() => handleToggleFavorite(item.id)}
        isFavorite={false}
      />
    );
  }, [navigation, handleToggleFavorite]);

  const keyExtractor = useCallback((item: ProcessedArticle) => item.id, []);

  const renderEmptyState = useCallback(() => {
    if (newsState.loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading cybersecurity news...</Text>
        </View>
      );
    }

    if (newsState.error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{newsState.error}</Text>
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
  }, [newsState.loading, newsState.error, searchQuery, filteredArticles.length, colors.accent]);

  const handleDebugRefresh = useCallback(async () => {
    console.log('🔄 DEBUG: Force refreshing articles...');
    setRefreshing(true);
    try {
      await refreshNews();
      console.log('✅ DEBUG: Refresh completed');
    } catch (error) {
      console.error('❌ DEBUG: Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshNews]);

  const renderHeader = useCallback(() => {
    return (
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Recent Cybersecurity News</Text>
              <Text style={styles.subtitle}>Latest articles from the past week</Text>
            </View>
            <TouchableOpacity 
              onPress={handleDebugRefresh}
              style={{
                padding: 8,
                backgroundColor: colors.accent,
                borderRadius: 20,
                marginLeft: 10
              }}
            >
              <Ionicons name="refresh" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <SearchBar 
          value={searchQuery} 
          onChangeText={setSearchQuery}
          placeholder="Search news..."
        />

        {/* Ad Banner */}
        <AdBanner size="banner" showCloseButton={true} />
        {/* Debug info */}
        {__DEV__ && (
          <View style={{ padding: 10, backgroundColor: '#f0f0f0', margin: 10 }}>
            <Text style={{ fontSize: 12, color: '#666' }}>
              Debug: AdBanner should be visible above
            </Text>
          </View>
        )}
        
        {newsState.summarizing && (
          <View style={styles.aiStatus}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.aiStatusText}>AI is summarizing articles...</Text>
          </View>
        )}
      </View>
    );
  }, [newsState.summarizing, colors.accent]);

  if (newsState.loading && filteredArticles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading news...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={5}
        ListFooterComponent={() => (
          <View style={{ paddingVertical: SPACING.lg, alignItems: 'center' }}>
            <Text style={styles.lastUpdated}>
              Last updated: {newsState.lastUpdated ? newsState.lastUpdated.toLocaleTimeString() : 'Never'}
            </Text>
            <Text style={styles.lastUpdated}>{filteredArticles.length} recent articles</Text>
            <Text style={styles.lastUpdated}>
              Total stored: {newsState.totalStoredArticles} articles ({newsState.storageSize})
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
