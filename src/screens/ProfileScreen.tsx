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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { TYPOGRAPHY, SPACING } from '../constants';

export function ProfileScreen() {
  const { colors } = useTheme();
  const { authState, signOut, updateProfile } = useSupabase();
  const navigation = useNavigation();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (authState.user) {
      setDisplayName(authState.user.displayName || '');
      setEmail(authState.user.email);
      setAvatarUrl(authState.user.avatarUrl || '');
    }
  }, [authState.user]);

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
        // In a real app, you would upload this to Supabase Storage
        // For now, we'll just set the local state
        setAvatarUrl(result.assets[0].uri);
        Alert.alert('Success', 'Profile picture updated! (Note: This is a demo - image not uploaded to server)');
      }
    } catch (error) {
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
            <TouchableOpacity style={styles.avatarEditButton} onPress={handleImagePicker}>
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
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleSignOut}
          >
            <Text style={[styles.buttonText, styles.dangerButtonText]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
