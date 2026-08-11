import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ArticleRow } from '../components/ArticleRow';
import { TrendingCard, TRENDING_CARD_WIDTH } from '../components/TrendingCard';
import { SectionHeader } from '../components/SectionHeader';
import { SkeletonFeed } from '../components/SkeletonCard';
import { SearchBar } from '../components/SearchBar';
import { useNews } from '../context/NewsContext';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { ProcessedArticle } from '../services/newsService';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../constants';
import { filterDisplayableArticles } from '../utils/articleQuality';
import { sortWithBreakingPinned } from '../utils/breakingNews';

type NewsCategory = 'all';

type RouteParams = {
  selectedCategory?: NewsCategory;
};

/** How many stories head the trending rail. */
const TRENDING_COUNT = 4;
/**
 * Below this the feed is too thin to split — everything stays in Top stories
 * rather than showing a rail of the same articles listed directly beneath it.
 */
const MIN_ARTICLES_FOR_TRENDING = 6;

export function NewsListScreen() {
  const navigation = useNavigation<StackNavigationProp<any, any>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { state, refreshNews, toggleFavorite, favorites, loadMoreNews, getRecentArticles } =
    useNews();
  const { colors, isDark } = useTheme();
  const { authState } = useSupabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (colors && colors.background) {
      setIsInitialized(true);
    }
  }, [colors]);

  useEffect(() => {
    if (route.params?.selectedCategory) {
      console.log('Category selection ignored - using search instead');
    }
  }, [route.params?.selectedCategory]);

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
    // Drop provider junk (package releases, forum posts, slug-derived titles)
    // before anything can surface it — a headline of "begun development" was
    // reaching the top trending slot.
    const articlesToSearch = filterDisplayableArticles(
      recentArticles.length > 0 ? recentArticles : state.articles
    );

    if (!searchQuery.trim()) {
      // A live incident outranks newer routine news for a few hours, after
      // which the pin lapses and the feed is chronological again. Search
      // results stay relevance-ordered, so this only applies to the feed.
      return sortWithBreakingPinned(articlesToSearch);
    }

    const query = searchQuery.toLowerCase();
    return articlesToSearch.filter(
      article =>
        article.title.toLowerCase().includes(query) ||
        article.summary.toLowerCase().includes(query) ||
        article.category.toLowerCase().includes(query)
    );
  }, [searchQuery, recentArticles, state.articles]);

  const isSearching = searchQuery.trim().length > 0;

  // While searching the rail is suppressed so results read as a single ranked
  // list instead of being split across two sections.
  const showTrending = !isSearching && filteredArticles.length >= MIN_ARTICLES_FOR_TRENDING;

  const trendingArticles = useMemo(
    () => (showTrending ? filteredArticles.slice(0, TRENDING_COUNT) : []),
    [showTrending, filteredArticles]
  );

  const topStories = useMemo(
    () => (showTrending ? filteredArticles.slice(TRENDING_COUNT) : filteredArticles),
    [showTrending, filteredArticles]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNews();
    setRefreshing(false);
  }, [refreshNews]);

  const handleArticlePress = useCallback(
    (article: ProcessedArticle) => {
      navigation.navigate('ArticleDetail', {
        article,
        isFavorite: favorites.includes(article.id),
      });
    },
    [navigation, favorites]
  );

  const handleToggleFavorite = useCallback(
    (articleId: string) => {
      toggleFavorite(articleId);
    },
    [toggleFavorite]
  );

  const handleLoadMore = useCallback(() => {
    if (!state.loadingMore && state.hasMore) {
      loadMoreNews();
    }
  }, [state.loadingMore, state.hasMore, loadMoreNews]);

  const handleProfilePress = () => {
    navigation.navigate('Profile' as never);
  };

  // Memoised so the list header keeps a stable identity between renders —
  // rebuilding it remounts the trending rail and throws away its scroll offset.
  const styles = useMemo(
    () =>
      StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.sm,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    // Square, clipped box so the mark is never letterboxed or cropped by the
    // row height — the previous 80x80 logo dominated the header.
    logoMark: {
      width: 32,
      height: 32,
      borderRadius: BORDER_RADIUS.sm,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    wordmark: {
      ...TYPOGRAPHY.h4,
      fontSize: 19,
      color: colors.textPrimary,
      marginLeft: SPACING.sm,
      flexShrink: 1,
    },
    avatarButton: {
      marginLeft: SPACING.sm,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
    },
    avatarPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    listContainer: {
      paddingHorizontal: SPACING.md,
      // Clears the absolutely positioned 72pt tab bar plus breathing room.
      paddingBottom: 96,
    },
    trendingSection: {
      marginBottom: SPACING.lg,
    },
    sectionHeader: {
      marginBottom: SPACING.sm,
    },
    // Cancels the list's horizontal padding so cards can scroll edge to edge.
    trendingList: {
      marginHorizontal: -SPACING.md,
    },
    trendingContent: {
      paddingHorizontal: SPACING.md,
    },
    trendingSeparator: {
      width: SPACING.md - 4,
    },
    topStoriesHeader: {
      marginBottom: SPACING.xs,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACING.xl,
      minHeight: 240,
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
    footerContainer: {
      paddingVertical: SPACING.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadMoreButton: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: colors.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadMoreText: {
      ...TYPOGRAPHY.button,
      color: colors.accent,
    },
      }),
    [colors]
  );

  const renderTopStory = useCallback(
    ({ item }: { item: ProcessedArticle }) => (
      <ArticleRow
        article={item}
        onPress={handleArticlePress}
        onToggleFavorite={handleToggleFavorite}
        isFavorite={favorites.includes(item.id)}
      />
    ),
    [handleArticlePress, handleToggleFavorite, favorites]
  );

  const renderTrendingCard = useCallback(
    ({ item }: { item: ProcessedArticle }) => (
      <TrendingCard article={item} onPress={handleArticlePress} />
    ),
    [handleArticlePress]
  );

  const keyExtractor = useCallback((item: ProcessedArticle) => item.id, []);

  // Elements rather than component functions: FlatList treats a new function
  // identity as a new element type and remounts, which would restart the
  // skeleton pulse and reset the trending rail mid-scroll.
  const listHeader = useMemo(() => {
    if (state.loading && filteredArticles.length === 0) {
      return null;
    }

    return (
      <View>
        {showTrending && (
          <View style={styles.trendingSection}>
            <SectionHeader
              title="Trending today"
              count={trendingArticles.length}
              style={styles.sectionHeader}
            />

            <FlatList
              data={trendingArticles}
              renderItem={renderTrendingCard}
              keyExtractor={keyExtractor}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.trendingList}
              contentContainerStyle={styles.trendingContent}
              ItemSeparatorComponent={() => <View style={styles.trendingSeparator} />}
              snapToInterval={TRENDING_CARD_WIDTH + SPACING.md - 4}
              decelerationRate="fast"
            />
          </View>
        )}

        {topStories.length > 0 && (
          <SectionHeader
            title={isSearching ? 'Results' : 'Top stories today'}
            count={topStories.length}
            style={styles.topStoriesHeader}
          />
        )}
      </View>
    );
  }, [
    state.loading,
    filteredArticles.length,
    showTrending,
    trendingArticles,
    topStories.length,
    isSearching,
    renderTrendingCard,
    keyExtractor,
    styles,
  ]);

  const emptyState = useMemo(() => {
    if (state.loading) {
      return <SkeletonFeed count={6} variant="row" />;
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
          {isSearching
            ? `No articles found for "${searchQuery}". Try a different search term.`
            : 'No cybersecurity news available at the moment.'}
        </Text>
      </View>
    );
  }, [state.loading, state.error, isSearching, searchQuery, styles]);

  const listFooter = useMemo(() => {
    if (!state.hasMore || topStories.length === 0) {
      return null;
    }

    return (
      <View style={styles.footerContainer}>
        <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
          <Text style={styles.loadMoreText}>
            {state.loadingMore ? 'Loading…' : 'Load more stories'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [state.hasMore, state.loadingMore, topStories.length, handleLoadMore, styles]);

  if (!isInitialized) {
    // Skeleton rows in the shape of the real feed, so the list does not jump
    // when articles land.
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.listContainer}>
          <SkeletonFeed count={7} variant="row" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brand}>
            <View style={styles.logoMark}>
              <Image
                source={
                  isDark
                    ? // Filename must stay free of spaces: Metro fails to resolve
                      // spaced asset paths on iOS, which rendered an empty box.
                      require('../../assets/icons/cs-logo-dark.png')
                    : require('../../assets/icons/ios-light.png')
                }
                style={styles.logoImage}
                resizeMode="contain"
                accessibilityLabel="CyberSimply logo"
              />
            </View>

            <Text style={styles.wordmark} numberOfLines={1} ellipsizeMode="tail">
              CyberSimply
            </Text>
          </View>

          <TouchableOpacity
            style={styles.avatarButton}
            onPress={handleProfilePress}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            {authState.user?.avatarUrl ? (
              <Image
                source={{ uri: authState.user.avatarUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={18} color={colors.textSecondary} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search news..." />
      </View>

      <FlatList
        data={topStories}
        renderItem={renderTopStory}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        ListFooterComponent={listFooter}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        windowSize={10}
        initialNumToRender={8}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
      />
    </SafeAreaView>
  );
}
