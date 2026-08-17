import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ProcessedArticle } from '../services/newsService';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../constants';
import { formatArticleDate } from '../utils/dateUtils';
import { formatTextForDisplay } from '../utils/textUtils';
import {
  getArticleCategory,
  getCategoryColor,
  getCategoryIcon,
  hasAiSummary,
} from '../utils/articleCategory';
import { ArticleImage } from './ArticleImage';
import { CategoryTag } from './CategoryTag';
import { BreakingBadge } from './BreakingBadge';

const THUMB_SIZE = 56;

interface ArticleRowProps {
  article: ProcessedArticle;
  onPress: (article: ProcessedArticle) => void;
  /** Omit to hide the star entirely, for lists where favouriting is not wired up. */
  onToggleFavorite?: (articleId: string) => void;
  isFavorite?: boolean;
  /** Turn off where the list is already grouped by date, to avoid repeating it. */
  showTime?: boolean;
}

/**
 * The compact article row shared by the feed, archive and favourites lists:
 * 56x56 thumbnail, category tag, two-line headline, and source + AI badge +
 * relative time on one meta line. Visible text length is bounded by
 * `numberOfLines`, never by slicing the source strings.
 */
export const ArticleRow = memo(function ArticleRow({
  article,
  onPress,
  onToggleFavorite,
  isFavorite = false,
  showTime = true,
}: ArticleRowProps) {
  const { colors, isDark } = useTheme();
  const category = getArticleCategory(article);
  const showAiBadge = hasAiSummary(article);
  const accent = getCategoryColor(category.kind, colors);

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: SPACING.md - 4,
    },
    separator: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    thumb: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: 10,
      backgroundColor: colors.surface,
    },
    // Stands in for missing artwork at the thumbnail's own size, so a row
    // without an image takes up no more room than one with it.
    categoryThumb: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: `${accent}${isDark ? '2E' : '1A'}`,
    },
    body: {
      flex: 1,
      marginLeft: SPACING.md - 4,
      // Without a min height a missing tag or single-line headline makes
      // neighbouring rows visibly different heights.
      minHeight: THUMB_SIZE,
      justifyContent: 'center',
    },
    headline: {
      ...TYPOGRAPHY.caption,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: SPACING.xs,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: SPACING.xs,
    },
    source: {
      ...TYPOGRAPHY.small,
      color: colors.textSecondary,
      fontWeight: '600',
      flexShrink: 1,
    },
    sparkle: {
      marginLeft: 4,
    },
    dot: {
      ...TYPOGRAPHY.small,
      color: colors.textSecondary,
      marginHorizontal: 5,
    },
    time: {
      ...TYPOGRAPHY.small,
      color: colors.textSecondary,
    },
    favorite: {
      paddingLeft: SPACING.sm,
      paddingTop: 2,
    },
  });

  return (
    <TouchableOpacity
      style={[styles.row, styles.separator]}
      onPress={() => onPress(article)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={article.title}
    >
      <ArticleImage
        imageUrl={article.imageUrl}
        containerStyle={styles.thumb}
        resizeMode="cover"
        fallback={
          <View style={styles.categoryThumb}>
            <Ionicons name={getCategoryIcon(category.kind) as any} size={22} color={accent} />
          </View>
        }
      />

      <View style={styles.body}>
        {/* The breaking badge replaces the category tag rather than stacking
            beside it — the row only has space for one marker. */}
        {article.isBreaking ? (
          <BreakingBadge category={article.breakingCategory} />
        ) : (
          <CategoryTag kind={category.kind} label={category.label} />
        )}

        <Text style={styles.headline} numberOfLines={2} ellipsizeMode="tail">
          {formatTextForDisplay(article.title)}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.source} numberOfLines={1} ellipsizeMode="tail">
            {article.source || article.authorDisplay || 'Unknown'}
          </Text>

          {showAiBadge && (
            <Ionicons
              name="sparkles"
              size={11}
              color={colors.accent}
              style={styles.sparkle}
              accessibilityLabel="Summarized with AI"
            />
          )}

          {showTime && (
            <>
              <Text style={styles.dot}>·</Text>

              <Text style={styles.time} numberOfLines={1}>
                {formatArticleDate(article.publishedAt, { relative: true })}
              </Text>
            </>
          )}
        </View>
      </View>

      {onToggleFavorite && (
        <TouchableOpacity
          style={styles.favorite}
          onPress={() => onToggleFavorite(article.id)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Ionicons
            name={isFavorite ? 'star' : 'star-outline'}
            size={18}
            color={isFavorite ? '#FFD700' : colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});
