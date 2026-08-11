import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ArticleRow } from '../components/ArticleRow';
import { AdBanner } from '../components/AdBanner';
import { useNews } from '../context/NewsContext';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { ProcessedArticle } from '../services/newsService';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../constants';

export function FavoritesScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { state, favorites, toggleFavorite } = useNews();
  const { authState } = useSupabase();

  const favoritedArticles = useMemo(
    () => state.articles.filter(article => favorites.includes(article.id)),
    [state.articles, favorites],
  );

  const hasFavorites = favoritedArticles.length > 0;

  const handleArticlePress = useCallback(
    (article: ProcessedArticle) => {
      navigation.navigate('ArticleDetail' as never, {
        article,
        isFavorite: true,
      } as never);
    },
    [navigation],
  );

  const handleProfilePress = useCallback(() => {
    navigation.navigate('Profile' as never);
  }, [navigation]);

  const handleBrowseNews = useCallback(() => {
    navigation.navigate('News' as never);
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
        headerText: {
          flex: 1,
          paddingRight: SPACING.sm,
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
        adSlot: {
          marginTop: SPACING.sm,
        },
        list: {
          flex: 1,
        },
        listContainer: {
          paddingHorizontal: SPACING.md,
          paddingBottom: SPACING.xl * 2,
          flexGrow: 1,
        },
        emptyState: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: SPACING.xl,
          paddingBottom: SPACING.xl * 2,
        },
        emptyStateTitle: {
          ...TYPOGRAPHY.h3,
          color: colors.textPrimary,
          marginTop: SPACING.md,
          marginBottom: SPACING.xs,
        },
        emptyStateText: {
          ...TYPOGRAPHY.body,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
        },
        cta: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'center',
          marginTop: SPACING.lg,
          paddingVertical: SPACING.sm + 2,
          paddingHorizontal: SPACING.lg,
          borderRadius: BORDER_RADIUS.full,
          backgroundColor: colors.accent,
        },
        ctaText: {
          ...TYPOGRAPHY.button,
          color: '#FFFFFF',
          marginRight: SPACING.xs,
        },
      }),
    [colors],
  );

  const renderArticle = useCallback(
    ({ item }: { item: ProcessedArticle }) => (
      <ArticleRow
        article={item}
        onPress={handleArticlePress}
        onToggleFavorite={toggleFavorite}
        isFavorite
      />
    ),
    [handleArticlePress, toggleFavorite],
  );

  const keyExtractor = useCallback((item: ProcessedArticle) => item.id, []);

  const emptyState = useMemo(
    () => (
      <View style={styles.emptyState}>
        <Ionicons name="star-outline" size={56} color={colors.textSecondary} />
        <Text style={styles.emptyStateTitle}>No favorites yet</Text>
        <Text style={styles.emptyStateText}>
          Tap the star on any article to save it here for later.
        </Text>

        <TouchableOpacity
          style={styles.cta}
          onPress={handleBrowseNews}
          accessibilityRole="button"
          accessibilityLabel="Browse the news feed"
        >
          <Text style={styles.ctaText}>Browse news</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    ),
    [styles, colors.textSecondary, handleBrowseNews],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Favorites</Text>
            <Text style={styles.subtitle}>Your saved cybersecurity articles</Text>
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

        {/* An ad stacked on top of "no favorites yet" is the worst possible
            first impression, so the slot only exists once there is content. */}
        {hasFavorites && (
          <View style={styles.adSlot}>
            <AdBanner size="small" showCloseButton={false} />
          </View>
        )}
      </View>

      <FlatList
        style={styles.list}
        data={favoritedArticles}
        renderItem={renderArticle}
        keyExtractor={keyExtractor}
        ListEmptyComponent={emptyState}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
