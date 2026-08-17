import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalThumbnailService } from './localThumbnailService';

export class ImageGenerationService {
  private static readonly CACHE_PREFIX = 'thumbnail_cache_';
  private static readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Main function to get thumbnail - now uses local generation by default
  static async getThumbnail(article: any): Promise<string> {
    try {
      // First, check cache
      const cachedUrl = await this.getCachedThumbnail(article.id);
      if (cachedUrl) {
        return cachedUrl;
      }

      // Use local thumbnail generation instead of external APIs
      const localThumbnail = LocalThumbnailService.generateEnhancedThumbnail(article);
      
      // Cache the generated thumbnail
      await this.cacheThumbnail(article.id, localThumbnail);
      
      return localThumbnail;
      
    } catch (error) {
      console.error('Error getting thumbnail:', error);
      // Ultimate fallback
      return LocalThumbnailService.generateThumbnail(article);
    }
  }

  // Cache thumbnail locally
  static async cacheThumbnail(articleId: string, imageUrl: string): Promise<void> {
    try {
      const cacheKey = this.CACHE_PREFIX + articleId;
      const cacheData = {
        url: imageUrl,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching thumbnail:', error);
    }
  }

  // Get cached thumbnail
  static async getCachedThumbnail(articleId: string): Promise<string | null> {
    try {
      const cacheKey = this.CACHE_PREFIX + articleId;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const cacheData = JSON.parse(cached);
        const isExpired = Date.now() - cacheData.timestamp > this.CACHE_EXPIRY;
        
        if (!isExpired) {
          return cacheData.url;
        } else {
          // Remove expired cache
          await AsyncStorage.removeItem(cacheKey);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached thumbnail:', error);
      return null;
    }
  }

  // Legacy OpenAI function (disabled due to billing limit)
  static async generateThumbnailWithOpenAI(article: any): Promise<string | null> {
    console.log('OpenAI thumbnail generation disabled due to billing limit');
    return LocalThumbnailService.generateEnhancedThumbnail(article);
  }

  // Legacy Gemini function (disabled)
  static async generateThumbnailWithGemini(article: any): Promise<string | null> {
    console.log('Gemini thumbnail generation disabled');
    return LocalThumbnailService.generateEnhancedThumbnail(article);
  }
}
