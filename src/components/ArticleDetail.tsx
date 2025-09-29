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
  const route = useRoute();
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

  // Determine if this is a ProcessedArticle or Article
  const isProcessedArticle = 'what' in article && 'impact' in article && 'takeaways' in article;
  
  // Get the appropriate content
  const content = isProcessedArticle ? article.summary : (article as Article).content;
  const whyThisMatters = isProcessedArticle 
    ? (article as ProcessedArticle).whyThisMatters
    : (article as Article).whyItMatters?.[0] || '';

  // Get author information
  const author = isProcessedArticle ? (article as ProcessedArticle).author : null;
  const source = article.source;

  // Format the summary text
  const summaryText = formatTextForDisplay(content);
  
  // Debug logging
  console.log(`🔍 ArticleDetail - Article data:`, {
    title: article.title,
    summary: summaryText,
    summaryLength: summaryText ? summaryText.length : 0,
    imageUrl: article.imageUrl,
    source: article.source,
    isProcessedArticle: isProcessedArticle,
    rawSummary: isProcessedArticle ? (article as ProcessedArticle).summary : 'N/A',
    content: content,
    sourceUrl: article.sourceUrl,
    redirectUrl: (article as any).redirect_url
  });

  // Debug sections for ProcessedArticle
  if (isProcessedArticle) {
    const processedArticle = article as ProcessedArticle;
    console.log("🔍 Detail Screen Sections:", {
      what: processedArticle.what,
      impact: processedArticle.impact,
      takeaways: processedArticle.takeaways,
      whyThisMatters: processedArticle.whyThisMatters
    });
    
    // Log section population status
    console.log("📊 Section Population Status:", {
      hasWhat: !!processedArticle.what,
      hasImpact: !!processedArticle.impact,
      hasTakeaways: !!processedArticle.takeaways,
      hasWhyThisMatters: !!processedArticle.whyThisMatters,
      allSectionsPopulated: !!(processedArticle.what && processedArticle.impact && processedArticle.takeaways && processedArticle.whyThisMatters)
    });
  }

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
            maxLines={3}
            textStyle={{
              color: colors.textPrimary,
              lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
            }}
          />
        </View>

        {isProcessedArticle && (
          <View style={styles.aiSummaryContainer}>
            {/* Always display What Happened section */}
            <View style={styles.aiSection}>
              <Text style={styles.aiSectionTitle}>What Happened</Text>
              <ExpandableSummary 
                text={formatTextForDisplay(
                  (article as ProcessedArticle).what && 
                  !(article as ProcessedArticle).what.includes('processing error') && 
                  !(article as ProcessedArticle).what.includes('Details not available')
                    ? (article as ProcessedArticle).what 
                    : `This article discusses ${article.title}. The details provide important information about cybersecurity developments.`
                )}
                maxLines={2}
                textStyle={styles.aiSectionContent}
              />
            </View>

            {/* Always display Impact section */}
            <View style={styles.aiSection}>
              <Text style={styles.aiSectionTitle}>Impact</Text>
              <ExpandableSummary 
                text={formatTextForDisplay(
                  (article as ProcessedArticle).impact && 
                  !(article as ProcessedArticle).impact.includes('processing error') && 
                  !(article as ProcessedArticle).impact.includes('Unable to determine')
                    ? (article as ProcessedArticle).impact 
                    : `This cybersecurity development impacts digital safety and security awareness. Understanding these events helps protect against similar threats.`
                )}
                maxLines={2}
                textStyle={styles.aiSectionContent}
              />
            </View>

            {/* Always display Key Takeaways section */}
            <View style={styles.aiSection}>
              <Text style={styles.aiSectionTitle}>Key Takeaways</Text>
              <ExpandableSummary 
                text={formatTextForDisplay(
                  (article as ProcessedArticle).takeaways && 
                  !(article as ProcessedArticle).takeaways.includes('processing error')
                    ? (article as ProcessedArticle).takeaways 
                    : `Key takeaways from this article include staying informed about cybersecurity threats, following security best practices, and monitoring for similar incidents.`
                )}
                maxLines={2}
                textStyle={styles.aiSectionContent}
              />
            </View>
          </View>
        )}

        {isProcessedArticle && (
          <View style={styles.whyItMattersContainer}>
            <Text style={styles.whyItMattersTitle}>Why This Matters</Text>
            <ExpandableSummary 
              text={formatTextForDisplay(
                (article as ProcessedArticle).whyThisMatters && 
                !(article as ProcessedArticle).whyThisMatters.includes('processing error')
                  ? (article as ProcessedArticle).whyThisMatters 
                  : `Understanding these cybersecurity events helps protect your digital safety and keeps you informed about emerging threats.`
              )}
              maxLines={2}
              textStyle={styles.whyItMattersPoint}
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
