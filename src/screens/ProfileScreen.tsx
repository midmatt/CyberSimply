import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { TYPOGRAPHY, SPACING } from '../constants';
import { profileImageService } from '../services/profileImageService';

export function ProfileScreen() {
  const { colors } = useTheme();
  const { authState, signOut, updateProfile, refreshUserProfile } = useSupabase();
  const navigation = useNavigation();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (authState.user) {
      setDisplayName(authState.user.displayName || '');
      setEmail(authState.user.email);
      // Use cache-busted URL for avatar
      const cacheBustedUrl = profileImageService.getProfileImageUrl(authState.user.avatarUrl);
      setAvatarUrl(cacheBustedUrl || '');
    }
  }, [authState.user]);

  // Load Stay Logged In preference
  useEffect(() => {
    loadStayLoggedInPreference();
  }, []);

  const loadStayLoggedInPreference = async () => {
    try {
      const preference = await AsyncStorage.getItem('stay_logged_in');
      setStayLoggedIn(preference === 'true');
    } catch (error) {
      console.error('Error loading stay logged in preference:', error);
    }
  };

  const handleStayLoggedInToggle = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('stay_logged_in', value.toString());
      setStayLoggedIn(value);
      
      if (value) {
        Alert.alert(
          'Stay Logged In Enabled',
          'You will remain logged in when you restart the app.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Stay Logged In Disabled',
          'You will need to sign in again when you restart the app.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error saving stay logged in preference:', error);
      Alert.alert('Error', 'Failed to update preference');
    }
  };

  const handleUpdateProfile = async () => {
    if (!authState.user) return;

    setIsLoading(true);
    try {
      const result = await updateProfile({
        display_name: displayName,
        // Note: Email updates would require re-authentication in a real app
      });

      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully!');
        setIsEditing(false);
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePicker = async () => {
    if (!authState.user) {
      Alert.alert('Error', 'You must be logged in to update your profile picture');
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Show upload progress
        setIsUploadingImage(true);
        setUploadProgress(0);
        
        // Store old avatar URL for cleanup
        const oldAvatarUrl = authState.user.avatarUrl;
        
        // Update local state immediately for better UX
        setAvatarUrl(imageUri);
        
        try {
          // Ensure avatar bucket exists
          const bucketResult = await profileImageService.ensureAvatarBucket();
          if (!bucketResult.success) {
            throw new Error(bucketResult.error || 'Failed to ensure avatar bucket');
          }

          // Upload image and update profile
          const uploadResult = await profileImageService.updateProfileImage(
            authState.user.id,
            imageUri,
            (progress) => {
              setUploadProgress(Math.round(progress * 100));
            }
          );

          if (uploadResult.success && uploadResult.avatarUrl) {
            // Update local state with the new URL
            setAvatarUrl(uploadResult.avatarUrl);
            
            // Clean up old image (don't wait for this)
            if (oldAvatarUrl) {
              profileImageService.deleteOldProfileImage(oldAvatarUrl).catch(error => {
                console.warn('Failed to delete old profile image:', error);
              });
            }
            
            // Refresh user profile to get the latest data
            await refreshUserProfile();
            
            Alert.alert('Success', 'Profile picture updated successfully!');
          } else {
            // Revert to old avatar on failure
            setAvatarUrl(profileImageService.getProfileImageUrl(oldAvatarUrl) || '');
            Alert.alert('Error', uploadResult.error || 'Failed to update profile picture');
          }
        } catch (error) {
          // Revert to old avatar on failure
          setAvatarUrl(profileImageService.getProfileImageUrl(oldAvatarUrl) || '');
          console.error('Profile image update error:', error);
          Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update profile picture');
        } finally {
          setIsUploadingImage(false);
          setUploadProgress(0);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            const result = await signOut();
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive',
          onPress: async () => {
            await performAccountDeletion();
          }
        }
      ]
    );
  };

  const performAccountDeletion = async () => {
    if (!authState.user) return;

    setIsLoading(true);
    try {
      // Call the Supabase RPC function to delete the user
      const { supabase } = require('../services/supabaseClient');
      const { error } = await supabase.rpc('delete_user', {
        uid: authState.user.id
      });

      if (error) {
        throw error;
      }

      // Clear local storage
      await AsyncStorage.multiRemove(['stay_logged_in', 'guest_user_id']);
      
      // Sign out and redirect to login
      await signOut();
      
      Alert.alert(
        'Account Deleted',
        'Your account has been successfully deleted.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert(
        'Error',
        'Failed to delete account. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Account Information</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: SPACING.sm,
      marginLeft: -SPACING.sm,
    },
    headerTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.text,
      fontWeight: '600',
    },
    headerSpacer: {
      width: 40, // Same width as back button to center the title
    },
    keyboardContainer: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: SPACING.lg,
      paddingTop: SPACING.md, // Reduced top padding since we have header
    },
    header: {
      alignItems: 'center',
      marginBottom: SPACING.lg,
      paddingTop: SPACING.sm,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: SPACING.md,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.cardBackground,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.cardBackground,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    avatarEditButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.accent,
      borderRadius: 15,
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarEditButtonDisabled: {
      opacity: 0.5,
    },
    uploadOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    uploadProgress: {
      backgroundColor: colors.background,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    uploadProgressText: {
      ...TYPOGRAPHY.caption,
      color: colors.text,
      fontWeight: '600',
    },
    name: {
      ...TYPOGRAPHY.h2,
      color: colors.text,
      marginBottom: SPACING.xs,
    },
    email: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: SPACING.xl,
    },
    sectionTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.text,
      marginBottom: SPACING.md,
    },
    inputContainer: {
      marginBottom: SPACING.md,
    },
    label: {
      ...TYPOGRAPHY.caption,
      color: colors.text,
      marginBottom: SPACING.xs,
      fontWeight: '600',
    },
    input: {
      ...TYPOGRAPHY.body,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: SPACING.sm,
      color: colors.text,
    },
    inputDisabled: {
      backgroundColor: colors.background,
      color: colors.textSecondary,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      padding: SPACING.md,
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    buttonDisabled: {
      backgroundColor: colors.textSecondary,
    },
    buttonText: {
      ...TYPOGRAPHY.button,
      color: colors.background,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.accent,
    },
    secondaryButtonText: {
      color: colors.accent,
    },
    dangerButton: {
      backgroundColor: '#FF3B30',
      borderColor: '#FF3B30',
    },
    dangerButtonText: {
      color: colors.background,
    },
    infoContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    infoText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      marginLeft: SPACING.sm,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      padding: SPACING.md,
      marginBottom: SPACING.sm,
    },
    settingInfo: {
      flex: 1,
      marginRight: SPACING.md,
    },
    settingLabel: {
      ...TYPOGRAPHY.body,
      color: colors.text,
      fontWeight: '600',
      marginBottom: SPACING.xs,
    },
    settingDescription: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      lineHeight: TYPOGRAPHY.caption.lineHeight * 1.2,
    },
  });

  if (!authState.user) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.content}>
          <Text style={styles.name}>Not signed in</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={colors.textSecondary} />
              </View>
            )}
            {isUploadingImage && (
              <View style={styles.uploadOverlay}>
                <View style={styles.uploadProgress}>
                  <Text style={styles.uploadProgressText}>{uploadProgress}%</Text>
                </View>
              </View>
            )}
            <TouchableOpacity 
              style={[styles.avatarEditButton, isUploadingImage && styles.avatarEditButtonDisabled]} 
              onPress={handleImagePicker}
              disabled={isUploadingImage}
            >
              <Ionicons name="camera" size={16} color={colors.background} />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{displayName || 'No name set'}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your display name"
              placeholderTextColor={colors.textSecondary}
              editable={isEditing}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={email}
              editable={false}
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.infoText}>
              Email changes require re-authentication. Contact support for assistance.
            </Text>
          </View>

          {isEditing ? (
            <>
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleUpdateProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Ionicons name="refresh" size={16} color={colors.textSecondary} />
                    <Text style={styles.loadingText}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setIsEditing(false)}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setIsEditing(true)}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Stay Logged In</Text>
              <Text style={styles.settingDescription}>
                Keep me signed in when I restart the app
              </Text>
            </View>
            <Switch
              value={stayLoggedIn}
              onValueChange={handleStayLoggedInToggle}
              trackColor={{ false: colors.border, true: colors.accent + '40' }}
              thumbColor={stayLoggedIn ? colors.accent : colors.textSecondary}
              disabled={isLoading}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleSignOut}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.dangerButtonText]}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton, { backgroundColor: '#FF3B30', borderColor: '#FF3B30' }]}
            onPress={handleDeleteAccount}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.dangerButtonText]}>Delete My Account</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
