import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProcessedArticle } from '../services/newsService';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import { formatTextForDisplay, cleanSummaryText } from '../utils/textUtils';
import { formatArticleDate } from '../utils/dateUtils';
import { ArticleImage } from './ArticleImage';
import { BreakingBadge } from './BreakingBadge';

interface NewsCardProps {
  article: ProcessedArticle;
  onPress: (article: ProcessedArticle) => void;
  onToggleFavorite: (articleId: string) => void;
  isFavorite: boolean;
}

const CARD_RADIUS = BORDER_RADIUS.lg; // 16

export const NewsCard = memo(({ article, onPress, onToggleFavorite, isFavorite }: NewsCardProps) => {
  const { colors, isDark } = useTheme();

  const handlePress = () => {
    if (onPress && typeof onPress === 'function') {
      onPress(article);
    }
  };

  const handleFavoritePress = () => {
    if (onToggleFavorite && typeof onToggleFavorite === 'function') {
      onToggleFavorite(article.id);
    }
  };

  const handleAiBadgePress = () => {
    Alert.alert(
      'Simplified with AI',
      'This summary was rewritten by AI to be easier to read. Tap the article to see the original source.'
    );
  };

  // Prefer the AI-written `what` field: the providers clip their descriptions
  // to a snippet, so roughly 59% of stored summaries end mid-sentence. Fall back
  // to the provider text only when no AI text exists yet, and strip its
  // truncation marker first so the card never shows a dangling "[...]".
  //
  // The visible length is capped by numberOfLines on the Text below, never by a
  // character budget — measuring in characters cut headlines mid-word at a width
  // the layout had not actually reached.
  const previewText = React.useMemo(() => {
    const aiText = article.what?.trim();
    const usable =
      aiText && aiText.toUpperCase() !== 'N/A'
        ? aiText
        : cleanSummaryText(article.summary, article.title);
    return formatTextForDisplay(usable ?? '');
  }, [article.what, article.summary, article.title]);

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: CARD_RADIUS,
      marginBottom: SPACING.md,
      // In dark mode cardBackground (#1e1e1e) already sits above the screen
      // (#121212). In light mode both are #ffffff, so a hairline keeps the card
      // reading as a distinct object without restyling the global token.
      borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...SHADOWS.small,
    },
    imageWrapper: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderTopLeftRadius: CARD_RADIUS,
      borderTopRightRadius: CARD_RADIUS,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    content: {
      padding: SPACING.md,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    categoryLabel: {
      ...TYPOGRAPHY.small,
      color: colors.textSecondary,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      flex: 1,
    },
    favoriteButton: {
      padding: SPACING.xs,
      marginTop: -SPACING.xs,
      marginRight: -SPACING.xs,
    },
    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
      marginBottom: SPACING.xs,
    },
    sourceLabel: {
      ...TYPOGRAPHY.small,
      color: colors.textPrimary,
      fontWeight: '700',
    },
    aiBadge: {
      marginLeft: SPACING.xs,
      padding: 2,
    },
    breakingBadge: {
      marginBottom: SPACING.xs,
    },
    title: {
      ...TYPOGRAPHY.h3,
      color: colors.textPrimary,
      lineHeight: TYPOGRAPHY.h3.lineHeight * 1.05,
      marginBottom: SPACING.xs,
    },
    preview: {
      ...TYPOGRAPHY.caption,
      fontWeight: '400',
      color: colors.textSecondary,
      lineHeight: TYPOGRAPHY.caption.lineHeight * 1.25,
    },
    dateText: {
      ...TYPOGRAPHY.small,
      color: colors.textSecondary,
      marginTop: SPACING.sm,
    },
  });

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.85}>
      <View style={styles.imageWrapper}>
        <ArticleImage
          imageUrl={article.imageUrl}
          containerStyle={styles.image}
          showPlaceholderText={false}
          placeholderIconSize={32}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.metaRow}>
          <Text style={styles.categoryLabel} numberOfLines={1}>
            {article.category}
          </Text>

          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleFavoritePress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Ionicons
              name={isFavorite ? 'star' : 'star-outline'}
              size={20}
              color={isFavorite ? '#FFD700' : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.sourceRow}>
          <Text style={styles.sourceLabel} numberOfLines={1}>
            {article.source || article.authorDisplay || 'Unknown'}
          </Text>

          <TouchableOpacity
            style={styles.aiBadge}
            onPress={handleAiBadgePress}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Simplified with AI. Tap for details."
          >
            <Ionicons name="sparkles" size={12} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {article.isBreaking && (
          <BreakingBadge category={article.breakingCategory} style={styles.breakingBadge} />
        )}

        <Text style={styles.title} numberOfLines={3} ellipsizeMode="tail">
          {formatTextForDisplay(article.title)}
        </Text>

        <Text style={styles.preview} numberOfLines={2} ellipsizeMode="tail">
          {previewText}
        </Text>

        <Text style={styles.dateText}>{formatArticleDate(article.publishedAt, { relative: true })}</Text>
      </View>
    </TouchableOpacity>
  );
});
