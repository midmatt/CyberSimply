import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProcessedArticle } from '../services/newsService';
import { useTheme } from '../context/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import { formatTextForDisplay } from '../utils/textUtils';
import { formatArticleDate } from '../utils/dateUtils';
import { ExpandableSummary } from './ExpandableSummary';
import { ArticleImage } from './ArticleImage';
import { contentModerationService, ContentQualityScore } from '../services/contentModerationService';

interface EnhancedNewsCardProps {
  article: ProcessedArticle;
  onPress: (article: ProcessedArticle) => void;
  onToggleFavorite: (articleId: string) => void;
  isFavorite: boolean;
  showQualityScore?: boolean;
  isAIGenerated?: boolean;
  onLoadMore?: () => void;
  isLastItem?: boolean;
}

export const EnhancedNewsCard = memo(({ 
  article, 
  onPress, 
  onToggleFavorite, 
  isFavorite,
  showQualityScore = false,
  isAIGenerated = false,
  onLoadMore,
  isLastItem = false
}: EnhancedNewsCardProps) => {
  const { colors } = useTheme();
  const [qualityScore, setQualityScore] = useState<ContentQualityScore | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handlePress = () => {
    if (onPress && typeof onPress === 'function') {
      onPress(article);
    }
  };

  const handleReadMore = async () => {
    try {
      await Linking.openURL(article.sourceUrl);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  const handleFavoritePress = () => {
    if (onToggleFavorite && typeof onToggleFavorite === 'function') {
      onToggleFavorite(article.id);
    }
  };

  const handleAnalyzeQuality = async () => {
    if (isAnalyzing || qualityScore) return;
    
    setIsAnalyzing(true);
    try {
      const result = await contentModerationService.moderateArticle(article);
      setQualityScore(result.qualityScore);
    } catch (error) {
      console.error('Quality analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatArticleDate(dateString, { relative: true });
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return '#34C759';
    if (score >= 60) return '#FF9500';
    return '#FF3B30';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING.md,
      overflow: 'hidden',
      ...SHADOWS.medium,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: SPACING.md,
    },
    headerLeft: {
      flex: 1,
      marginRight: SPACING.sm,
    },
    title: {
      ...TYPOGRAPHY.h4,
      color: colors.text,
      marginBottom: SPACING.xs,
      lineHeight: 22,
    },
    metaInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    source: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginRight: SPACING.sm,
    },
    date: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
    },
    aiBadge: {
      backgroundColor: colors.accent + '20',
      paddingHorizontal: SPACING.xs,
      paddingVertical: 2,
      borderRadius: BORDER_RADIUS.sm,
      marginLeft: SPACING.xs,
    },
    aiBadgeText: {
      ...TYPOGRAPHY.caption,
      color: colors.accent,
      fontSize: 10,
      fontWeight: '600',
    },
    qualityBadge: {
      backgroundColor: qualityScore ? getQualityColor(qualityScore.overall) + '20' : colors.textSecondary + '20',
      paddingHorizontal: SPACING.xs,
      paddingVertical: 2,
      borderRadius: BORDER_RADIUS.sm,
      marginLeft: SPACING.xs,
    },
    qualityBadgeText: {
      ...TYPOGRAPHY.caption,
      color: qualityScore ? getQualityColor(qualityScore.overall) : colors.textSecondary,
      fontSize: 10,
      fontWeight: '600',
    },
    favoriteButton: {
      padding: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: colors.surface,
    },
    imageContainer: {
      height: 200,
      backgroundColor: colors.surface,
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    content: {
      padding: SPACING.md,
    },
    summary: {
      ...TYPOGRAPHY.body,
      color: colors.text,
      lineHeight: 20,
      marginBottom: SPACING.md,
    },
    expandableSection: {
      marginBottom: SPACING.sm,
    },
    sectionTitle: {
      ...TYPOGRAPHY.caption,
      color: colors.accent,
      fontWeight: '600',
      marginBottom: SPACING.xs,
      textTransform: 'uppercase',
    },
    sectionContent: {
      ...TYPOGRAPHY.body,
      color: colors.text,
      lineHeight: 18,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: SPACING.sm,
    },
    readMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      backgroundColor: colors.accent + '20',
      borderRadius: BORDER_RADIUS.sm,
    },
    readMoreText: {
      ...TYPOGRAPHY.caption,
      color: colors.accent,
      fontWeight: '600',
      marginRight: SPACING.xs,
    },
    qualityButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.sm,
    },
    qualityText: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginRight: SPACING.xs,
    },
    loadMoreButton: {
      backgroundColor: colors.accent,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      borderRadius: BORDER_RADIUS.lg,
      alignItems: 'center',
      marginTop: SPACING.md,
    },
    loadMoreText: {
      ...TYPOGRAPHY.button,
      color: colors.background,
      fontWeight: '600',
    },
    qualityScoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: SPACING.xs,
    },
    qualityScoreItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    qualityScoreLabel: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginRight: SPACING.xs,
    },
    qualityScoreValue: {
      ...TYPOGRAPHY.caption,
      color: colors.text,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title} numberOfLines={2}>
              {formatTextForDisplay(article.title)}
            </Text>
            <View style={styles.metaInfo}>
              <Text style={styles.source}>{article.source}</Text>
              <Text style={styles.date}>{formatDate(article.publishedAt)}</Text>
              {isAIGenerated && (
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>AI</Text>
                </View>
              )}
              {showQualityScore && qualityScore && (
                <View style={styles.qualityBadge}>
                  <Text style={styles.qualityBadgeText}>
                    {getQualityLabel(qualityScore.overall)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleFavoritePress}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? '#FF3B30' : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <ArticleImage
          imageUrl={article.imageUrl}
          containerStyle={styles.imageContainer}
          style={styles.image}
        />

        <View style={styles.content}>
          <ExpandableSummary
            text={formatTextForDisplay(article.summary)}
            maxLines={3}
            textStyle={styles.summary}
          />

          <View style={styles.expandableSection}>
            <Text style={styles.sectionTitle}>What Happened</Text>
            <ExpandableSummary
              text={formatTextForDisplay(article.what)}
              maxLines={3}
            />
          </View>

          <View style={styles.expandableSection}>
            <Text style={styles.sectionTitle}>Why It Matters</Text>
            <ExpandableSummary
              text={formatTextForDisplay(article.impact)}
              maxLines={3}
            />
          </View>

          <View style={styles.expandableSection}>
            <Text style={styles.sectionTitle}>What You Can Do</Text>
            <ExpandableSummary
              text={formatTextForDisplay(article.takeaways)}
              maxLines={3}
            />
          </View>

          {showQualityScore && qualityScore && (
            <View style={styles.qualityScoreContainer}>
              <View style={styles.qualityScoreItem}>
                <Text style={styles.qualityScoreLabel}>Overall:</Text>
                <Text style={[styles.qualityScoreValue, { color: getQualityColor(qualityScore.overall) }]}>
                  {qualityScore.overall}%
                </Text>
              </View>
              <View style={styles.qualityScoreItem}>
                <Text style={styles.qualityScoreLabel}>Accuracy:</Text>
                <Text style={[styles.qualityScoreValue, { color: getQualityColor(qualityScore.accuracy) }]}>
                  {qualityScore.accuracy}%
                </Text>
              </View>
              <View style={styles.qualityScoreItem}>
                <Text style={styles.qualityScoreLabel}>Actionable:</Text>
                <Text style={[styles.qualityScoreValue, { color: getQualityColor(qualityScore.actionability) }]}>
                  {qualityScore.actionability}%
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.readMoreButton}
            onPress={handleReadMore}
            activeOpacity={0.7}
          >
            <Text style={styles.readMoreText}>Read Full Article</Text>
            <Ionicons name="open-outline" size={16} color={colors.accent} />
          </TouchableOpacity>

          {showQualityScore && (
            <TouchableOpacity
              style={styles.qualityButton}
              onPress={handleAnalyzeQuality}
              activeOpacity={0.7}
              disabled={isAnalyzing}
            >
              <Text style={styles.qualityText}>
                {isAnalyzing ? 'Analyzing...' : qualityScore ? 'Quality Analyzed' : 'Analyze Quality'}
              </Text>
              <Ionicons 
                name={isAnalyzing ? "hourglass-outline" : "analytics-outline"} 
                size={16} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {isLastItem && onLoadMore && (
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={onLoadMore}
          activeOpacity={0.8}
        >
          <Text style={styles.loadMoreText}>Load More Articles</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});
