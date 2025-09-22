import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Article } from '../types';
import { ProcessedArticle } from '../services/newsService';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import { formatTextForDisplay } from '../utils/textUtils';
import { RootStackParamList } from '../types';
import { AdBanner } from './AdBanner';
import { ExpandableSummary } from './ExpandableSummary';
import { ArticleImage } from './ArticleImage';

type ArticleDetailRouteProp = RouteProp<RootStackParamList, 'ArticleDetail'>;

export function ArticleDetail() {
  const navigation = useNavigation();
  const route = useRoute<ArticleDetailRouteProp>();
  const { colors } = useTheme();
  const { article, isFavorite = false } = route.params;

  // Create styles with access to colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.textPrimary,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      padding: SPACING.xs,
    },
    shareButton: {
      padding: SPACING.xs,
    },
    scrollContent: {
      padding: SPACING.md,
      paddingBottom: SPACING.xl,
    },
    image: {
      width: '100%',
      height: 200,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.md,
      resizeMode: 'cover',
    },
    title: {
      ...TYPOGRAPHY.h2,
      marginBottom: SPACING.xs,
      color: colors.textPrimary,
    },
    authorText: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      marginBottom: SPACING.sm,
      fontStyle: 'italic',
    },
    summaryContainer: {
      marginBottom: SPACING.md,
      backgroundColor: colors.cardBackground,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.textPrimary,
      marginBottom: SPACING.sm,
    },
    readMoreIcon: {
      // Icon styling handled by Ionicons component
    },
    aiSummaryContainer: {
      marginBottom: SPACING.lg,
    },
    aiSection: {
      backgroundColor: colors.cardBackground,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      ...SHADOWS.small,
    },
    aiSectionTitle: {
      ...TYPOGRAPHY.h4,
      marginBottom: SPACING.sm,
      color: colors.accent,
      fontWeight: '600',
    },
    aiSectionContent: {
      ...TYPOGRAPHY.body,
      color: colors.textPrimary,
      lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
    },
    whyItMattersContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      ...SHADOWS.small,
    },
    whyItMattersTitle: {
      ...TYPOGRAPHY.h4,
      marginBottom: SPACING.sm,
      color: colors.accent,
    },
    whyItMattersPoint: {
      ...TYPOGRAPHY.body,
      marginBottom: SPACING.xs,
      color: colors.textPrimary,
    },
    sourceLinkContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: SPACING.md,
    },
    sourceLink: {
      ...TYPOGRAPHY.button,
      color: colors.accent,
      marginRight: SPACING.xs,
    },
    sourceLinkIcon: {
      // No specific styles needed, color is set by prop
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
    },
    errorTitle: {
      ...TYPOGRAPHY.h2,
      color: colors.error,
      marginTop: SPACING.md,
      marginBottom: SPACING.sm,
    },
    errorMessage: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
    },
  });

  // Safety check - if no article, show error message
  if (!article) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Article Not Found</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Article Not Found</Text>
          <Text style={styles.errorMessage}>
            The article you're looking for could not be loaded. Please go back and try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    try {
      const message = `Check out this cybersecurity news: ${article.title}\n${article.sourceUrl || 'No source available'}`;
      await Share.share({
        message,
        url: article.sourceUrl,
        title: article.title,
      });
    } catch (error: any) {
      Alert.alert('Share Error', error.message || 'Failed to share article');
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSourceLinkPress = () => {
    if (article.sourceUrl && isValidUrl(article.sourceUrl)) {
      Linking.openURL(article.sourceUrl).catch(err => {
        console.error('Failed to open URL:', err);
        Alert.alert('Error', 'Could not open the source link. The URL may be invalid or inaccessible.');
      });
    } else if (article.sourceUrl && !isValidUrl(article.sourceUrl)) {
      console.warn('Invalid URL detected:', article.sourceUrl);
      Alert.alert('Invalid Link', 'This article has an invalid source URL and cannot be opened.');
    } else {
      Alert.alert('No Source', 'Source URL not available for this article.');
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  // Format author name function (same as in NewsCard)
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

  // Determine if this article has AI-generated fields
  // Check for database field names (snake_case) from Supabase
  const hasProcessedFields = !!(article as any).what || !!(article as any).impact || !!(article as any).takeaways || !!(article as any).why_this_matters;
  
  // Get the appropriate content
  const content = hasProcessedFields ? article.summary : (article as any).content;
  const whyThisMatters = hasProcessedFields 
    ? (article as any).why_this_matters
    : (article as any).whyItMatters?.[0] || '';

  // Get author information
  const author = (article as any).author;
  const source = article.source;

  // Format the summary text
  const summaryText = content ? formatTextForDisplay(content) : null;
  
  // Debug logging
  console.log(`🔍 ArticleDetail - Article data:`, {
    title: article.title,
    summary: summaryText,
    summaryLength: summaryText ? summaryText.length : 0,
    imageUrl: article.imageUrl,
    source: article.source,
    isProcessedArticle: hasProcessedFields,
    rawSummary: hasProcessedFields ? article.summary : 'N/A',
    content: content
  });

  // Debug sections for AI-generated fields
  console.log("🔍 Detail Screen AI Fields:", {
    what: (article as any).what,
    impact: (article as any).impact,
    takeaways: (article as any).takeaways,
    why_this_matters: (article as any).why_this_matters
  });
  
  // Log section population status
  console.log("📊 AI Section Population Status:", {
    hasWhat: !!(article as any).what,
    hasImpact: !!(article as any).impact,
    hasTakeaways: !!(article as any).takeaways,
    hasWhyThisMatters: !!(article as any).why_this_matters,
    allSectionsPopulated: !!((article as any).what && (article as any).impact && (article as any).takeaways && (article as any).why_this_matters)
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-outline" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Only render image if imageUrl exists and is valid */}
        {article.imageUrl && article.imageUrl.trim() !== '' && (
          <ArticleImage
            imageUrl={article.imageUrl}
            style={styles.image}
            showPlaceholder={false}
          />
        )}

        <Text style={styles.title}>{formatTextForDisplay(article.title)}</Text>
        
        {/* Show authorDisplay at the top */}
        <Text style={styles.authorText}>
          {article.authorDisplay} (simplified with AI)
        </Text>
        
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <ExpandableSummary 
            text={summaryText || "This article is currently unavailable."}
            textStyle={{
              color: colors.textPrimary,
              lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
            }}
          />
        </View>

        {/* What Happened section */}
        {(article as any).what && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>What Happened</Text>
            <ExpandableSummary 
              text={formatTextForDisplay((article as any).what ?? "")}
              textStyle={{
                color: colors.textPrimary,
                lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
              }}
            />
          </View>
        )}

        {/* Impact section */}
        {(article as any).impact && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Impact</Text>
            <ExpandableSummary 
              text={formatTextForDisplay((article as any).impact ?? "")}
              textStyle={{
                color: colors.textPrimary,
                lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
              }}
            />
          </View>
        )}

        {/* Key Takeaways section */}
        {(article as any).takeaways && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Key Takeaways</Text>
            <ExpandableSummary 
              text={formatTextForDisplay((article as any).takeaways ?? "")}
              textStyle={{
                color: colors.textPrimary,
                lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
              }}
            />
          </View>
        )}

        {/* Why This Matters section */}
        {(article as any).why_this_matters && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Why This Matters</Text>
            <ExpandableSummary 
              text={formatTextForDisplay((article as any).why_this_matters ?? "")}
              textStyle={{
                color: colors.textPrimary,
                lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
              }}
            />
          </View>
        )}

        {article.sourceUrl && (
          <TouchableOpacity onPress={handleSourceLinkPress} style={styles.sourceLinkContainer}>
            <Text style={styles.sourceLink}>
              Read full article at: {article.source || 'Source'}
            </Text>
            <Ionicons name="open-outline" size={18} color={colors.accent} style={styles.sourceLinkIcon} />
          </TouchableOpacity>
        )}

        {/* Ad Banner after content */}
        <AdBanner size="medium" showCloseButton={true} />
      </ScrollView>
    </SafeAreaView>
  );
}
