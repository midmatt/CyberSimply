import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ProcessedArticle } from '../services/newsService';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import { formatArticleDate } from '../utils/dateUtils';
import { formatTextForDisplay } from '../utils/textUtils';
import { getArticleCategory } from '../utils/articleCategory';
import { ArticleImage } from './ArticleImage';
import { CategoryTag } from './CategoryTag';
import { BreakingBadge } from './BreakingBadge';

export const TRENDING_CARD_WIDTH = 248;

interface TrendingCardProps {
  article: ProcessedArticle;
  onPress: (article: ProcessedArticle) => void;
}

export const TrendingCard = memo(function TrendingCard({ article, onPress }: TrendingCardProps) {
  const { colors, isDark } = useTheme();
  const category = getArticleCategory(article);

  const styles = StyleSheet.create({
    card: {
      width: TRENDING_CARD_WIDTH,
      backgroundColor: colors.cardBackground,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
      ...SHADOWS.small,
    },
    // Fixed 4:3 box: the image can never dictate the card height, so a tall
    // or wide source crops instead of distorting the row.
    imageWrapper: {
      width: '100%',
      aspectRatio: 4 / 3,
      backgroundColor: colors.surface,
    },
    imageFill: {
      width: '100%',
      height: '100%',
    },
    content: {
      padding: SPACING.sm + 2,
    },
    headline: {
      ...TYPOGRAPHY.caption,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: SPACING.xs,
    },
    timestamp: {
      ...TYPOGRAPHY.small,
      color: colors.textSecondary,
      marginTop: SPACING.xs,
    },
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(article)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={article.title}
    >
      <View style={styles.imageWrapper}>
        <ArticleImage
          imageUrl={article.imageUrl}
          containerStyle={styles.imageFill}
          resizeMode="cover"
          placeholderIconSize={28}
          showPlaceholderText={false}
        />
      </View>

      <View style={styles.content}>
        {article.isBreaking ? (
          <BreakingBadge category={article.breakingCategory} />
        ) : (
          <CategoryTag kind={category.kind} label={category.label} />
        )}

        <Text style={styles.headline} numberOfLines={2} ellipsizeMode="tail">
          {formatTextForDisplay(article.title)}
        </Text>

        <Text style={styles.timestamp} numberOfLines={1}>
          {formatArticleDate(article.publishedAt, { relative: true })}
        </Text>
      </View>
    </TouchableOpacity>
  );
});
