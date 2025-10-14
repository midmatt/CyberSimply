import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { NewsCard } from '../components/NewsCard';
import { SearchBar } from '../components/SearchBar';
import { AdBanner } from '../components/AdBanner';
import { useNews } from '../context/NewsContext';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { ProcessedArticle } from '../services/newsService';
import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';
import { directSupabaseService, DirectArticle } from '../services/directSupabaseService';

export function ArchiveScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { state: newsState, getArchivedArticles } = useNews();
  const { authState } = useSupabase();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create styles with access to colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContainer: {
      padding: SPACING.md,
      paddingBottom: SPACING.xl * 2, // Add extra bottom padding for footer
    },
    header: {
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
      paddingRight: SPACING.xl, // Add extra padding for profile button
      marginBottom: SPACING.lg,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingRight: SPACING.sm, // Add some padding to prevent cutoff
      position: 'relative',
    },
    searchContainer: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    titleContainer: {
      marginBottom: SPACING.md,
      alignItems: 'center',
    },
    profileButton: {
      padding: SPACING.xs,
      position: 'absolute',
      right: 0,
      top: 0,
      flexShrink: 0, // Prevent the button from shrinking
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
    title: {
      ...TYPOGRAPHY.h1,
      color: colors.textPrimary,
      marginBottom: SPACING.xs,
      textAlign: 'center',
    },
    subtitle: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: SPACING.md,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
    },
    emptyStateText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    lastUpdated: {
      ...TYPOGRAPHY.caption,
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: SPACING.sm,
    },
  });

  // Search functionality is now handled directly by setSearchQuery

  const handleToggleFavorite = useCallback((articleId: string) => {
    // Handle favorites if needed
    console.log('Toggle favorite:', articleId);
  }, []);

  // Get archived articles (older than two weeks) directly from Supabase
  const [archivedArticles, setArchivedArticles] = useState<ProcessedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadArchivedArticles = async () => {
      try {
        setIsLoading(true);
        console.log('ArchiveScreen: Fetching archived articles from Supabase...');
        
        // Fetch archived articles directly from Supabase
        const result = await directSupabaseService.getArticlesPaginated(
          100, // limit - Get up to 100 archived articles
          0, // offset
          'archived' // category - articles older than 2 weeks
        );
        
        if (result.success && result.data) {
          console.log(`ArchiveScreen: Successfully loaded ${result.data.length} archived articles from Supabase`);
          
          // Convert DirectArticle to ProcessedArticle
          const processedArticles: ProcessedArticle[] = result.data.map((article: DirectArticle) => {
            // Determine valid category
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
          });
          
          setArchivedArticles(processedArticles);
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
    
    // Load articles when component mounts
    loadArchivedArticles();
  }, []); // Empty dependency array - load once on mount

  // Filter archived articles based on search query
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) {
      return archivedArticles;
    }
    
    const query = searchQuery.toLowerCase();
    return archivedArticles.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.summary.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query)
    );
  }, [searchQuery, archivedArticles]);

  const renderArticle = useCallback(({ item }: { item: ProcessedArticle }) => {
    return (
      <NewsCard
        article={item}
        onPress={() => {
          navigation.navigate('ArticleDetail', { 
            article: item,
            isFavorite: false
          });
        }}
        onToggleFavorite={() => handleToggleFavorite(item.id)}
        isFavorite={false}
      />
    );
  }, [navigation, handleToggleFavorite]);

  const keyExtractor = useCallback((item: ProcessedArticle) => item.id, []);

  const handleProfilePress = () => {
    navigation.navigate('Profile' as never);
  };

  const renderEmptyState = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.emptyStateText}>Loading archived articles...</Text>
        </View>
      );
    }

    if (searchQuery.trim() && filteredArticles.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No archived articles found matching "{searchQuery}"
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>
          No archived articles yet! 📚{'\n'}Articles older than two weeks will automatically appear here as they age.
        </Text>
      </View>
    );
  }, [isLoading, searchQuery, filteredArticles.length, colors.accent]);

  // Header is now rendered directly in JSX to maintain SearchBar focus

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with title */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Article Archive</Text>
            <Text style={styles.subtitle}>Explore cybersecurity news from two weeks and beyond</Text>
          </View>
          
          <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
            {authState.user?.avatarUrl ? (
              <Image 
                source={{ uri: authState.user.avatarUrl }} 
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Ionicons 
                  name="person" 
                  size={20} 
                  color={colors.textSecondary} 
                />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* SearchBar - Outside FlatList to maintain focus */}
      <View style={styles.searchContainer}>
        <SearchBar 
          value={searchQuery} 
          onChangeText={setSearchQuery}
          placeholder="Search archived news..."
        />
      </View>
      
      <FlatList
        data={filteredArticles}
        renderItem={renderArticle}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={5}
        ListFooterComponent={() => (
          <View style={{ paddingVertical: SPACING.lg, alignItems: 'center' }}>
            <Text style={styles.lastUpdated}>
              {filteredArticles.length} archived articles
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
