import React, { useMemo } from 'react';
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
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { NewsCard } from '../components/NewsCard';
import { AdBanner } from '../components/AdBanner';
import { useNews } from '../context/NewsContext';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { ProcessedArticle } from '../services/newsService';
import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';

type NavigationProp = StackNavigationProp<RootStackParamList, keyof RootStackParamList>;

export function FavoritesScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { state, favorites, toggleFavorite } = useNews();
  const { authState } = useSupabase();

  const favoritedArticles = useMemo(() => {
    return state.articles.filter(article => favorites.includes(article.id));
  }, [state.articles, favorites]);

  const handleProfilePress = () => {
    navigation.navigate('Profile' as never);
  };

  const renderArticle = ({ item }: { item: any }) => (
    <NewsCard
      article={item}
      onPress={() => {
        // Navigate to article detail
        navigation.navigate('ArticleDetail', { 
          article: item,
          isFavorite: true
        });
      }}
      onToggleFavorite={toggleFavorite}
      isFavorite={true}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="star" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>No Favorites Yet</Text>
      <Text style={styles.emptyStateText}>
        Tap the star icon on any article to add it to your favorites.
      </Text>
    </View>
  );

  // Create styles with access to colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACING.sm,
    },
    title: {
      ...TYPOGRAPHY.h1,
      color: colors.textPrimary,
      marginBottom: SPACING.xs,
    },
    subtitle: {
      ...TYPOGRAPHY.body,
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
    listContainer: {
      padding: SPACING.md,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
      minHeight: 300,
    },
    emptyStateTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.textPrimary,
      marginTop: SPACING.md,
      marginBottom: SPACING.sm,
    },
    emptyStateText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Favorites</Text>
            <Text style={styles.subtitle}>Your saved cybersecurity articles</Text>
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
        
        {/* Ad Banner in header */}
        <AdBanner size="small" showCloseButton={false} />
      </View>

      <FlatList
        data={favoritedArticles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
