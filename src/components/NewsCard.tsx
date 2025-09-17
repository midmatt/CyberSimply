import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProcessedArticle } from '../services/newsService';
import { useTheme } from '../context/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import { formatTextForDisplay } from '../utils/textUtils';
import { formatArticleDate } from '../utils/dateUtils';
import { ExpandableSummary } from './ExpandableSummary';

interface NewsCardProps {
  article: ProcessedArticle;
  onPress: (article: ProcessedArticle) => void;
  onToggleFavorite: (articleId: string) => void;
  isFavorite: boolean;
}

export const NewsCard = memo(({ article, onPress, onToggleFavorite, isFavorite }: NewsCardProps) => {
  const { colors } = useTheme();

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

  const formatDate = (dateString: string) => {
    return formatArticleDate(dateString, { relative: true });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cybersecurity': return '#4CAF50';
      case 'hacking': return '#FF5722';
      case 'general': return '#9C27B0';
      default: return '#9C27B0';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cybersecurity': return 'shield-checkmark';
      case 'hacking': return 'warning';
      case 'general': return 'newspaper';
      default: return 'newspaper';
    }
  };

  const formatAuthorName = (author: string | null, source: string) => {
    if (author && author.trim()) {
      // Clean up author name - remove common prefixes and suffixes
      let cleanAuthor = author.trim();
      
      // Remove common prefixes
      cleanAuthor = cleanAuthor.replace(/^(By|by|By:|by:)\s*/i, '');
      
      // Remove common suffixes
      cleanAuthor = cleanAuthor.replace(/\s*(,.*|\(.*\)|\[.*\]).*$/, '');
      
      // If author is too long, truncate it
      if (cleanAuthor.length > 50) {
        cleanAuthor = cleanAuthor.substring(0, 47) + '...';
      }
      
      return cleanAuthor;
    }
    
    // If no author, use source domain name
    try {
      const url = new URL(source.includes('http') ? source : `https://${source}`);
      const domain = url.hostname.replace('www.', '');
      
      // Convert domain to a more readable format
      const domainParts = domain.split('.');
      if (domainParts.length >= 2) {
        const siteName = domainParts[0];
        return siteName.charAt(0).toUpperCase() + siteName.slice(1);
      }
      
      return domain;
    } catch {
      // If URL parsing fails, just use the source as is
      return source;
    }
  };

  // Create styles with access to colors
  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      ...SHADOWS.medium,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    categoryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryText: {
      ...TYPOGRAPHY.caption,
      marginLeft: SPACING.xs,
      fontWeight: '600',
    },
    favoriteButton: {
      padding: SPACING.xs,
    },
    title: {
      ...TYPOGRAPHY.h3,
      marginBottom: SPACING.xs,
      lineHeight: TYPOGRAPHY.h3.lineHeight * 1.1,
      color: colors.textPrimary, // Use theme-aware text color
    },
    authorText: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginBottom: SPACING.sm,
      fontStyle: 'italic',
    },
    summary: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary, // Use secondary text color with full white in dark mode
      marginBottom: SPACING.md,
      lineHeight: TYPOGRAPHY.body.lineHeight * 1.2,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    sourceInfo: {
      flex: 1,
    },
    sourceText: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary, // Use secondary text color with full white in dark mode
      marginBottom: SPACING.xs,
    },
    dateText: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary, // Use secondary text color with full white in dark mode
    },
    readMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      backgroundColor: colors.accent + '10',
      borderRadius: BORDER_RADIUS.sm,
    },
    readMoreText: {
      ...TYPOGRAPHY.button,
      color: colors.accent,
      marginRight: SPACING.xs,
    },
  });

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.header}>
        <View style={styles.categoryContainer}>
          <Ionicons 
            name={getCategoryIcon(article.category) as any} 
            size={16} 
            color={getCategoryColor(article.category)} 
          />
          <Text style={[styles.categoryText, { color: getCategoryColor(article.category) }]}>
            {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
        >
          <Ionicons
            name={isFavorite ? 'star' : 'star-outline'}
            size={20}
            color={isFavorite ? '#FFD700' : colors.textSecondary} // Use secondary text color with full white in dark mode
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {formatTextForDisplay(article.title)}
      </Text>

      {/* Show authorDisplay at the top */}
      <Text style={styles.authorText}>
        {article.authorDisplay || article.source || 'Unknown'} (simplified with AI)
      </Text>

      <ExpandableSummary 
        text={formatTextForDisplay(article.summary)}
        maxLines={3}
        textStyle={styles.summary}
      />

      <View style={styles.footer}>
        <View style={styles.sourceInfo}>
          <Text style={styles.sourceText}>
            {article.source}
          </Text>
          <Text style={styles.dateText}>{formatDate(article.publishedAt)}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.readMoreButton} 
          onPress={handleReadMore}
        >
          <Text style={styles.readMoreText}>Read More</Text>
          <Ionicons name="open-outline" size={16} color={colors.accent} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});
