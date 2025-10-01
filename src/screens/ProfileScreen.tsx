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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { TYPOGRAPHY, SPACING } from '../constants';

export function ProfileScreen() {
  const { colors } = useTheme();
  const { authState, signOut, updateProfile, refreshUserProfile } = useSupabase();
  const navigation = useNavigation();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);

  useEffect(() => {
    if (authState.user) {
      setDisplayName(authState.user.displayName || '');
      setEmail(authState.user.email);
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

  // Profile picture upload removed - feature disabled

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
      console.log('🗑️ [ProfileScreen] Starting account deletion for user:', authState.user.id);
      
      // Import the correct Supabase client
      const { supabase } = require('../services/supabaseClientProduction');
      
      // Try RPC function first
      console.log('🗑️ [ProfileScreen] Attempting RPC delete_user function...');
      const { error: rpcError } = await supabase.rpc('delete_user', {
        uid: authState.user.id
      });

      if (rpcError) {
        console.warn('⚠️ [ProfileScreen] RPC function failed, trying manual deletion:', rpcError);
        
        // Fallback: Manual deletion of user data
        console.log('🗑️ [ProfileScreen] Attempting manual deletion...');
        
        // Delete user preferences
        const { error: prefsError } = await supabase
          .from('user_preferences')
          .delete()
          .eq('user_id', authState.user.id);
        
        if (prefsError) {
          console.warn('⚠️ [ProfileScreen] Error deleting user preferences:', prefsError);
        }

        // Delete user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .delete()
          .eq('id', authState.user.id);
        
        if (profileError) {
          console.warn('⚠️ [ProfileScreen] Error deleting user profile:', profileError);
        }

        // Delete from auth.users (this requires admin privileges)
        const { error: authError } = await supabase.auth.admin.deleteUser(authState.user.id);
        
        if (authError) {
          console.warn('⚠️ [ProfileScreen] Error deleting auth user:', authError);
          // If admin delete fails, we'll still proceed with local cleanup
        }
      }

      // Clear all local storage
      console.log('🗑️ [ProfileScreen] Clearing local storage...');
      await AsyncStorage.multiRemove([
        'stay_logged_in', 
        'guest_user_id',
        'ad_free_status',
        'ad_free_last_sync'
      ]);
      
      // Sign out and redirect to login
      console.log('🗑️ [ProfileScreen] Signing out user...');
      await signOut();
      
      Alert.alert(
        'Account Deleted',
        'Your account has been successfully deleted.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ [ProfileScreen] Error deleting account:', error);
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
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color={colors.textSecondary} />
            </View>
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
