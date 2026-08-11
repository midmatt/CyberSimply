import React, { useCallback, useMemo } from 'react';
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
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useNews } from '../context/NewsContext';
import { useSupabase } from '../context/SupabaseContext';
import { AdBanner } from '../components/AdBanner';
import { CategoryCard } from '../components/CategoryCard';
import {
  ARTICLE_CATEGORIES,
  countArticleCategories,
  type ArticleCategoryMeta,
} from '../utils/articleCategory';
import { filterDisplayableArticles } from '../utils/articleQuality';

export function CategoriesScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { state } = useNews();
  const { authState } = useSupabase();

  // One pass over the loaded articles per list change, rather than re-deriving
  // a category for every article inside every card's render.
  const counts = useMemo(
    () => countArticleCategories(filterDisplayableArticles(state.articles)),
    [state.articles],
  );

  // An empty bucket is a dead end, so only offer categories that have articles.
  // Before anything loads there is nothing to count, so show the full set.
  const visibleCategories = useMemo(() => {
    const withArticles = ARTICLE_CATEGORIES.filter(category => counts[category.kind] > 0);
    return withArticles.length > 0 ? withArticles : ARTICLE_CATEGORIES;
  }, [counts]);

  const handleCategoryPress = useCallback(
    (category: ArticleCategoryMeta) => {
      navigation.navigate('CategoryArticles' as never, { category } as never);
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
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.sm,
          paddingBottom: SPACING.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          // The header sits above the scroll area and must paint opaquely over
          // it: without its own background and stacking order, rows scrolling
          // past showed through as ghost text across the divider.
          backgroundColor: colors.background,
          overflow: 'hidden',
          zIndex: 1,
          elevation: 1,
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
        // Without an explicit flex the scroll view sizes to its content and
        // overflows the screen instead of clipping to the area below the header.
        scrollView: {
          flex: 1,
        },
        scrollContent: {
          paddingHorizontal: SPACING.md,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.xl * 2,
        },
        infoSection: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.info + '10',
          borderRadius: BORDER_RADIUS.md,
          padding: SPACING.md,
          marginTop: SPACING.md,
        },
        infoText: {
          ...TYPOGRAPHY.caption,
          color: colors.textSecondary,
          marginLeft: SPACING.sm,
          flex: 1,
        },
      }),
    [colors],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Categories</Text>
            <Text style={styles.subtitle}>Browse cybersecurity news by topic</Text>
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {visibleCategories.map(category => (
          <CategoryCard
            key={category.kind}
            category={category}
            count={counts[category.kind]}
            onPress={handleCategoryPress}
          />
        ))}

        <AdBanner size="medium" showCloseButton={false} />

        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            Select a category to view related cybersecurity news and articles.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
