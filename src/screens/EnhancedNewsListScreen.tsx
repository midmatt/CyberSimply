import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { EnhancedNewsCard } from '../components/EnhancedNewsCard';
import { SearchBar } from '../components/SearchBar';
import { AdBanner } from '../components/AdBanner';
import { useNews } from '../context/NewsContext';
import { useTheme } from '../context/ThemeContext';
import { ProcessedArticle } from '../services/newsService';
import { infiniteScrollService } from '../services/infiniteScrollService';
import { smartSearchService, SearchQuery } from '../services/smartSearchService';
import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export function EnhancedNewsListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const { state: newsState, refreshNews, getRecentArticles } = useNews();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [articles, setArticles] = useState<ProcessedArticle[]>([]);
  const [searchResults, setSearchResults] = useState<ProcessedArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [showQualityScores, setShowQualityScores] = useState(false);
  const [aiGeneratedCount, setAiGeneratedCount] = useState(0);

  // Initialize infinite scroll service
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await infiniteScrollService.initialize();
        const result = await infiniteScrollService.loadInitialArticles();
        if (result.success) {
          setArticles(result.articles);
          setHasMore(result.articles.length >= 10);
        }
      } catch (error) {
        console.error('Failed to initialize infinite scroll:', error);
      }
    };

    initializeServices();
  }, []);

  // Load trending topics
  useEffect(() => {
    const loadTrendingTopics = async () => {
      try {
        const result = await smartSearchService.getTrendingSearchTerms();
        if (result.success) {
          setTrendingTopics(result.terms);
        }
      } catch (error) {
        console.error('Failed to load trending topics:', error);
      }
    };

    loadTrendingTopics();
  }, []);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchQuery: SearchQuery = {
        query: query.trim(),
        limit: 50
      };

      const result = await smartSearchService.searchArticles(articles, searchQuery);
      if (result.success) {
        setSearchResults(result.results.map(r => r.article));
        setSearchSuggestions(result.suggestions);
      }
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('Search Error', 'Failed to search articles. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [articles]);

  // Load more articles
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const result = await infiniteScrollService.loadMoreArticles();
      if (result.success) {
        setArticles(prev => [...prev, ...result.articles]);
        setHasMore(result.articles.length >= 10);
        setAiGeneratedCount(prev => prev + result.articles.filter(a => a.source === 'AI Generated').length);
      }
    } catch (error) {
      console.error('Failed to load more articles:', error);
      Alert.alert('Error', 'Failed to load more articles. Please try again.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore]);

  // Refresh articles
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await infiniteScrollService.refreshArticles();
      if (result.success) {
        setArticles(result.articles);
        setHasMore(result.articles.length >= 10);
        setAiGeneratedCount(result.articles.filter(a => a.source === 'AI Generated').length);
      }
    } catch (error) {
      console.error('Failed to refresh articles:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Get trending topics
  const handleGetTrendingTopics = useCallback(async () => {
    try {
      const result = await infiniteScrollService.getTrendingTopics();
      if (result.success) {
        setTrendingTopics(result.topics);
      }
    } catch (error) {
      console.error('Failed to get trending topics:', error);
    }
  }, []);

  // Toggle quality scores
  const toggleQualityScores = useCallback(() => {
    setShowQualityScores(prev => !prev);
  }, []);

  // Render article item
  const renderArticle = useCallback(({ item, index }: { item: ProcessedArticle; index: number }) => {
    const isLastItem = index === (searchQuery ? searchResults : articles).length - 1;
    const isAIGenerated = item.source === 'AI Generated';

    return (
      <EnhancedNewsCard
        article={item}
        onPress={() => {
          navigation.navigate('ArticleDetail', { 
            article: item,
            isFavorite: false
          });
        }}
        onToggleFavorite={(articleId) => {
          // Handle favorites if needed
          console.log('Toggle favorite:', articleId);
        }}
        isFavorite={false}
        showQualityScore={showQualityScores}
        isAIGenerated={isAIGenerated}
        onLoadMore={isLastItem && !searchQuery ? handleLoadMore : undefined}
        isLastItem={isLastItem && !searchQuery}
      />
    );
  }, [navigation, searchQuery, searchResults, articles, showQualityScores, handleLoadMore]);

  // Render trending topic
  const renderTrendingTopic = useCallback(({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.trendingTopic, { backgroundColor: colors.surface }]}
      onPress={() => setSearchQuery(item)}
      activeOpacity={0.7}
    >
      <Text style={[styles.trendingTopicText, { color: colors.text }]}>{item}</Text>
    </TouchableOpacity>
  ), [colors]);

  // Render search suggestion
  const renderSearchSuggestion = useCallback(({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.suggestionItem, { backgroundColor: colors.cardBackground }]}
      onPress={() => setSearchQuery(item)}
      activeOpacity={0.7}
    >
      <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
      <Text style={[styles.suggestionText, { color: colors.text }]}>{item}</Text>
    </TouchableOpacity>
  ), [colors]);

  // Get current articles to display
  const currentArticles = useMemo(() => {
    return searchQuery ? searchResults : articles;
  }, [searchQuery, searchResults, articles]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
      marginBottom: SPACING.lg,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACING.md,
    },
    titleContainer: {
      flex: 1,
    },
    title: {
      ...TYPOGRAPHY.h1,
      color: colors.text,
      marginBottom: SPACING.xs,
    },
    subtitle: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      padding: SPACING.sm,
      marginLeft: SPACING.sm,
      backgroundColor: colors.surface,
      borderRadius: 20,
    },
    searchContainer: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    trendingContainer: {
      marginBottom: SPACING.md,
    },
    trendingTitle: {
      ...TYPOGRAPHY.h4,
      color: colors.text,
      marginBottom: SPACING.sm,
      paddingHorizontal: SPACING.md,
    },
    trendingList: {
      paddingHorizontal: SPACING.md,
    },
    trendingTopic: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: 16,
      marginRight: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    trendingTopicText: {
      ...TYPOGRAPHY.caption,
      fontSize: 12,
    },
    suggestionsContainer: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.sm,
      borderRadius: 8,
      marginBottom: SPACING.xs,
    },
    suggestionText: {
      ...TYPOGRAPHY.body,
      marginLeft: SPACING.sm,
    },
    listContainer: {
      padding: SPACING.md,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACING.lg,
    },
    loadingText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      marginLeft: SPACING.sm,
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
      marginBottom: SPACING.lg,
    },
    emptyStateButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: 8,
    },
    emptyStateButtonText: {
      ...TYPOGRAPHY.button,
      color: colors.background,
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: colors.surface,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: SPACING.lg,
    },
    statText: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginLeft: SPACING.xs,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Latest News</Text>
            <Text style={styles.subtitle}>
              Stay updated with the latest cybersecurity insights
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={toggleQualityScores}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={showQualityScores ? "analytics" : "analytics-outline"} 
                size={20} 
                color={colors.accent} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleGetTrendingTopics}
              activeOpacity={0.7}
            >
              <Ionicons name="trending-up-outline" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar 
          value={searchQuery} 
          onChangeText={setSearchQuery}
          placeholder="Search cybersecurity news..."
          onSubmitEditing={() => handleSearch(searchQuery)}
        />
      </View>

      {/* Search Suggestions */}
      {searchSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={searchSuggestions}
            renderItem={renderSearchSuggestion}
            keyExtractor={(item, index) => `suggestion-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* Trending Topics */}
      {!searchQuery && trendingTopics.length > 0 && (
        <View style={styles.trendingContainer}>
          <Text style={styles.trendingTitle}>Trending Topics</Text>
          <FlatList
            data={trendingTopics}
            renderItem={renderTrendingTopic}
            keyExtractor={(item, index) => `trending-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingList}
          />
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="newspaper-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.statText}>{currentArticles.length} articles</Text>
        </View>
        {aiGeneratedCount > 0 && (
          <View style={styles.statItem}>
            <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
            <Text style={styles.statText}>{aiGeneratedCount} AI generated</Text>
          </View>
        )}
        {showQualityScores && (
          <View style={styles.statItem}>
            <Ionicons name="analytics-outline" size={16} color={colors.accent} />
            <Text style={styles.statText}>Quality scores enabled</Text>
          </View>
        )}
      </View>

      {/* Articles List */}
      <FlatList
        data={currentArticles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
        onEndReached={!searchQuery ? handleLoadMore : undefined}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? `No articles found for "${searchQuery}"`
                : 'No articles available'
              }
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={handleRefresh}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyStateButtonText}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListFooterComponent={() => {
          if (isLoadingMore) {
            return (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.loadingText}>Loading more articles...</Text>
              </View>
            );
          }
          return null;
        }}
      />

      {/* Ad Banner */}
      <AdBanner size="medium" showCloseButton={true} />
    </SafeAreaView>
  );
}
