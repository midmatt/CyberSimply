// Profile Image Service
// Handles profile picture uploads to Supabase Storage and database updates

import { supabase } from './supabaseClient';
import { TABLES } from '../constants/supabaseConfig';
import { Platform } from 'react-native';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ProfileImageUpdate {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

export class ProfileImageService {
  private static instance: ProfileImageService;
  private static readonly AVATAR_BUCKET = 'avatars';
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  private constructor() {}

  public static getInstance(): ProfileImageService {
    if (!ProfileImageService.instance) {
      ProfileImageService.instance = new ProfileImageService();
    }
    return ProfileImageService.instance;
  }

  /**
   * Upload profile image to Supabase Storage
   */
  public async uploadProfileImage(
    userId: string,
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<ImageUploadResult> {
    try {
      console.log('📸 [ProfileImage] Starting image upload for user:', userId);

      // Validate file
      const validationResult = await this.validateImage(imageUri);
      if (!validationResult.valid) {
        return { success: false, error: validationResult.error };
      }

      // Create unique filename with timestamp for cache busting
      const timestamp = Date.now();
      const fileExtension = this.getFileExtension(imageUri);
      const fileName = `${userId}_${timestamp}${fileExtension}`;
      const filePath = `profile-images/${fileName}`;

      console.log('📸 [ProfileImage] Uploading to path:', filePath);

      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(ProfileImageService.AVATAR_BUCKET)
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false, // Don't overwrite existing files
        });

      if (error) {
        console.error('❌ [ProfileImage] Upload failed:', error);
        return { success: false, error: `Upload failed: ${error.message}` };
      }

      console.log('✅ [ProfileImage] Upload successful:', data);

      // Get public URL with cache busting
      const { data: urlData } = supabase.storage
        .from(ProfileImageService.AVATAR_BUCKET)
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${timestamp}`;
      console.log('🔗 [ProfileImage] Public URL:', publicUrl);

      return { success: true, url: publicUrl };

    } catch (error) {
      console.error('❌ [ProfileImage] Upload error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  }

  /**
   * Update user profile with new avatar URL
   */
  public async updateProfileAvatar(
    userId: string,
    avatarUrl: string
  ): Promise<ProfileImageUpdate> {
    try {
      console.log('👤 [ProfileImage] Updating profile avatar for user:', userId);

      const { error } = await supabase
        .from(TABLES.USER_PROFILES)
        .update({ 
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ [ProfileImage] Database update failed:', error);
        return { success: false, error: `Database update failed: ${error.message}` };
      }

      console.log('✅ [ProfileImage] Profile avatar updated successfully');

      return { success: true, avatarUrl };

    } catch (error) {
      console.error('❌ [ProfileImage] Profile update error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Profile update failed' 
      };
    }
  }

  /**
   * Complete profile image update process
   */
  public async updateProfileImage(
    userId: string,
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<ProfileImageUpdate> {
    try {
      console.log('🔄 [ProfileImage] Starting complete profile image update');

      // Step 1: Upload image to storage
      const uploadResult = await this.uploadProfileImage(userId, imageUri, onProgress);
      if (!uploadResult.success || !uploadResult.url) {
        return { success: false, error: uploadResult.error };
      }

      // Step 2: Update user profile with new URL
      const updateResult = await this.updateProfileAvatar(userId, uploadResult.url);
      if (!updateResult.success) {
        // If database update fails, we should clean up the uploaded file
        console.warn('⚠️ [ProfileImage] Database update failed, uploaded file may remain in storage');
        return updateResult;
      }

      console.log('✅ [ProfileImage] Complete profile image update successful');
      return updateResult;

    } catch (error) {
      console.error('❌ [ProfileImage] Complete update error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Profile image update failed' 
      };
    }
  }

  /**
   * Delete old profile image from storage
   */
  public async deleteOldProfileImage(avatarUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!avatarUrl || !avatarUrl.includes(ProfileImageService.AVATAR_BUCKET)) {
        // Not a Supabase storage URL, nothing to delete
        return { success: true };
      }

      console.log('🗑️ [ProfileImage] Deleting old profile image:', avatarUrl);

      // Extract file path from URL
      const urlParts = avatarUrl.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params
      const filePath = `profile-images/${fileName}`;

      const { error } = await supabase.storage
        .from(ProfileImageService.AVATAR_BUCKET)
        .remove([filePath]);

      if (error) {
        console.warn('⚠️ [ProfileImage] Failed to delete old image:', error);
        // Don't fail the whole operation if old image deletion fails
        return { success: true };
      }

      console.log('✅ [ProfileImage] Old profile image deleted successfully');
      return { success: true };

    } catch (error) {
      console.warn('⚠️ [ProfileImage] Error deleting old image:', error);
      // Don't fail the whole operation if old image deletion fails
      return { success: true };
    }
  }

  /**
   * Get profile image URL with cache busting
   */
  public getProfileImageUrl(avatarUrl: string | null | undefined): string | null {
    if (!avatarUrl) return null;
    
    // Add cache busting parameter if not already present
    if (avatarUrl.includes('?t=')) {
      return avatarUrl;
    }
    
    return `${avatarUrl}?t=${Date.now()}`;
  }

  /**
   * Validate image file
   */
  private async validateImage(imageUri: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Check file size
      if (blob.size > ProfileImageService.MAX_FILE_SIZE) {
        return { 
          valid: false, 
          error: `File too large. Maximum size is ${ProfileImageService.MAX_FILE_SIZE / (1024 * 1024)}MB` 
        };
      }

      // Check file type
      if (!ProfileImageService.ALLOWED_TYPES.includes(blob.type)) {
        return { 
          valid: false, 
          error: `Invalid file type. Allowed types: ${ProfileImageService.ALLOWED_TYPES.join(', ')}` 
        };
      }

      return { valid: true };

    } catch (error) {
      return { 
        valid: false, 
        error: 'Failed to validate image file' 
      };
    }
  }

  /**
   * Get file extension from URI
   */
  private getFileExtension(uri: string): string {
    const extension = uri.split('.').pop()?.toLowerCase();
    return extension ? `.${extension}` : '.jpg';
  }

  /**
   * Ensure avatar bucket exists
   */
  public async ensureAvatarBucket(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🪣 [ProfileImage] Ensuring avatar bucket exists');

      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('❌ [ProfileImage] Error listing buckets:', listError);
        return { success: false, error: listError.message };
      }

      const bucketExists = buckets?.some(bucket => bucket.name === ProfileImageService.AVATAR_BUCKET);
      
      if (bucketExists) {
        console.log('✅ [ProfileImage] Avatar bucket already exists');
        return { success: true };
      }

      // Create bucket if it doesn't exist
      const { data, error } = await supabase.storage.createBucket(ProfileImageService.AVATAR_BUCKET, {
        public: true,
        allowedMimeTypes: ProfileImageService.ALLOWED_TYPES,
        fileSizeLimit: ProfileImageService.MAX_FILE_SIZE,
      });

      if (error) {
        console.error('❌ [ProfileImage] Error creating bucket:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [ProfileImage] Avatar bucket created successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ [ProfileImage] Error ensuring bucket:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to ensure bucket' 
      };
    }
  }
}

// Export singleton instance
export const profileImageService = ProfileImageService.getInstance();
