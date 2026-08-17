import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ArticleRow } from '../components/ArticleRow';
import { SectionHeader } from '../components/SectionHeader';
import { SkeletonFeed } from '../components/SkeletonCard';
import { SearchBar } from '../components/SearchBar';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { ProcessedArticle } from '../services/newsService';
import { TYPOGRAPHY, SPACING } from '../constants';
import { directSupabaseService, DirectArticle } from '../services/directSupabaseService';
import { formatArticleDate, parseDate } from '../utils/dateUtils';
import { filterDisplayableArticles } from '../utils/articleQuality';

interface ArchiveSection {
  title: string;
  data: ProcessedArticle[];
}

/**
 * Groups by calendar day, newest first, so the archive reads as a timeline.
 * Undated articles fall into a single trailing bucket rather than being
 * dropped or scattered.
 */
function groupByDay(articles: ProcessedArticle[]): ArchiveSection[] {
  const buckets = new Map<string, { sortKey: number; title: string; data: ProcessedArticle[] }>();

  for (const article of articles) {
    const date = parseDate(article.publishedAt);
    const key = date ? date.toDateString() : 'unknown';
    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = {
        // Undated entries sort last.
        sortKey: date ? date.getTime() : -Infinity,
        title: date ? formatArticleDate(article.publishedAt) : 'Date unknown',
        data: [],
      };
      buckets.set(key, bucket);
    }

    bucket.data.push(article);
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ title, data }) => ({ title, data }));
}

export function ArchiveScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { authState } = useSupabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [archivedArticles, setArchivedArticles] = useState<ProcessedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadArchivedArticles = async () => {
      try {
        setIsLoading(true);

        const result = await directSupabaseService.getArticlesPaginated(
          100,
          0,
          'archived', // articles older than two weeks
        );

        if (result.success && result.data) {
          const processedArticles: ProcessedArticle[] = result.data.map(
            (article: DirectArticle) => {
              let validCategory: 'cybersecurity' | 'hacking' | 'general' = 'general';
              if (article.category === 'cybersecurity' || article.category === 'hacking') {
                validCategory = article.category;
              }

              return {
                id: article.id,
                title: article.title,
                summary: article.summary,
                source: article.source,
                sourceUrl: article.redirect_url || '',
                author: article.author || '',
                authorDisplay: article.author || article.source || 'Unknown',
                publishedAt: article.published_at,
                imageUrl: article.image_url || '',
                category: validCategory,
                what: article.what || '',
                impact: article.impact || '',
                takeaways: article.takeaways || '',
                whyThisMatters: article.why_this_matters || '',
                aiSummaryGenerated: article.ai_summary_generated || false,
              };
            },
          );

          setArchivedArticles(filterDisplayableArticles(processedArticles));
        } else {
          console.error('ArchiveScreen: Failed to load archived articles:', result.error);
          setArchivedArticles([]);
        }
      } catch (error) {
        console.error('ArchiveScreen: Failed to load archived articles:', error);
        setArchivedArticles([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadArchivedArticles();
  }, []);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) {
      return archivedArticles;
    }

    const query = searchQuery.toLowerCase();
    return archivedArticles.filter(
      article =>
        article.title.toLowerCase().includes(query) ||
        article.summary.toLowerCase().includes(query) ||
        article.category.toLowerCase().includes(query),
    );
  }, [searchQuery, archivedArticles]);

  const sections = useMemo(() => groupByDay(filteredArticles), [filteredArticles]);

  const handleArticlePress = useCallback(
    (article: ProcessedArticle) => {
      navigation.navigate('ArticleDetail' as never, {
        article,
        isFavorite: false,
      } as never);
    },
    [navigation],
  );

  const handleProfilePress = useCallback(() => {
    navigation.navigate('Profile' as never);
  }, [navigation]);

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
          backgroundColor: colors.background,
          overflow: 'hidden',
          zIndex: 1,
        },
        headerTop: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        },
        title: {
          ...TYPOGRAPHY.h1,
          color: colors.textPrimary,
          marginBottom: 2,
        },
        subtitle: {
          ...TYPOGRAPHY.caption,
          color: colors.textSecondary,
        },
        headerText: {
          flex: 1,
          paddingRight: SPACING.sm,
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
        searchContainer: {
          paddingHorizontal: SPACING.md,
          paddingBottom: SPACING.sm,
          backgroundColor: colors.background,
        },
        list: {
          flex: 1,
        },
        listContainer: {
          paddingHorizontal: SPACING.md,
          paddingBottom: SPACING.xl * 2,
        },
        sectionHeader: {
          backgroundColor: colors.background,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.xs,
        },
        emptyState: {
          alignItems: 'center',
          paddingHorizontal: SPACING.xl,
          paddingTop: SPACING.xl * 2,
        },
        emptyStateText: {
          ...TYPOGRAPHY.body,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: SPACING.md,
          lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
        },
        footerText: {
          ...TYPOGRAPHY.caption,
          textAlign: 'center',
          color: colors.textSecondary,
        },
      }),
    [colors],
  );

  const renderArticle = useCallback(
    ({ item }: { item: ProcessedArticle }) => (
      <ArticleRow article={item} onPress={handleArticlePress} showTime={false} />
    ),
    [handleArticlePress],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: ArchiveSection }) => (
      <SectionHeader
        title={section.title}
        count={section.data.length}
        style={styles.sectionHeader}
      />
    ),
    [styles.sectionHeader],
  );

  const keyExtractor = useCallback((item: ProcessedArticle) => item.id, []);

  const emptyState = useMemo(() => {
    if (isLoading) {
      return <SkeletonFeed count={6} variant="row" />;
    }

    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateText}>
            No archived articles match "{searchQuery}".
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="archive-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.emptyStateText}>
          No archived articles yet. Articles older than two weeks appear here as they age.
        </Text>
      </View>
    );
  }, [isLoading, searchQuery, styles, colors.textSecondary]);

  const footer = useMemo(() => {
    if (filteredArticles.length === 0) {
      return null;
    }

    return (
      <View style={{ paddingVertical: SPACING.lg }}>
        <Text style={styles.footerText}>
          {filteredArticles.length} archived article
          {filteredArticles.length === 1 ? '' : 's'}
        </Text>
      </View>
    );
  }, [filteredArticles.length, styles.footerText]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Archive</Text>
            <Text style={styles.subtitle}>Cybersecurity news from two weeks and beyond</Text>
          </View>

          <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
            {authState.user?.avatarUrl ? (
              <Image source={{ uri: authState.user.avatarUrl }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Ionicons name="person" size={20} color={colors.textSecondary} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Kept outside the list so typing does not remount it and drop focus. */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search archived news..."
        />
      </View>

      <SectionList
        style={styles.list}
        sections={sections}
        renderItem={renderArticle}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        ListEmptyComponent={emptyState}
        ListFooterComponent={footer}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />
    </SafeAreaView>
  );
}
