import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { useAdFree } from '../context/AdFreeContext';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function SettingsScreen() {
  const { theme, isDark, colors, setTheme, toggleTheme } = useTheme();
  const { authState, signOut, convertGuestToUser, updateProfile } = useSupabase();
  const { isAdFree } = useAdFree();
  const navigation = useNavigation();

  // Account management state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);

  // Load user data and preferences
  useEffect(() => {
    if (authState.user) {
      setDisplayName(authState.user.displayName || '');
    }
    loadStayLoggedInPreference();
  }, [authState.user]);

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
      });

      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully!');
        setIsEditingProfile(false);
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
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
      console.log('🗑️ [SettingsScreen] Starting account deletion for user:', authState.user.id);
      
      // Import the correct Supabase client
      const { supabase } = require('../services/supabaseClient');
      
      // Try RPC function first
      console.log('🗑️ [SettingsScreen] Attempting RPC delete_user function...');
      const { error: rpcError } = await supabase.rpc('delete_user', {
        uid: authState.user.id
      });

      if (rpcError) {
        console.warn('⚠️ [SettingsScreen] RPC function failed, trying manual deletion:', rpcError);
        
        // Fallback: Manual deletion of user data
        console.log('🗑️ [SettingsScreen] Attempting manual deletion...');
        
        // Delete user preferences
        const { error: prefsError } = await supabase
          .from('user_preferences')
          .delete()
          .eq('user_id', authState.user.id);
        
        if (prefsError) {
          console.warn('⚠️ [SettingsScreen] Error deleting user preferences:', prefsError);
        }

        // Delete user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .delete()
          .eq('id', authState.user.id);
        
        if (profileError) {
          console.warn('⚠️ [SettingsScreen] Error deleting user profile:', profileError);
        }

        // Delete from auth.users (this requires admin privileges)
        const { error: authError } = await supabase.auth.admin.deleteUser(authState.user.id);
        
        if (authError) {
          console.warn('⚠️ [SettingsScreen] Error deleting auth user:', authError);
          // If admin delete fails, we'll still proceed with local cleanup
        }
      }

      // Clear all local storage (including IAP status since account is being deleted)
      console.log('🗑️ [SettingsScreen] Clearing local storage...');
      await AsyncStorage.multiRemove([
        'stay_logged_in', 
        'guest_user_id',
        'ad_free_status',
        'ad_free_last_sync'
      ]);
      
      // Sign out and redirect to login
      console.log('🗑️ [SettingsScreen] Signing out user...');
      await signOut();
      
      Alert.alert(
        'Account Deleted',
        'Your account has been successfully deleted.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ [SettingsScreen] Error deleting account:', error);
      Alert.alert(
        'Error',
        'Failed to delete account. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSupportPress = () => {
    navigation.navigate('Support' as never);
  };

  const handleFeedbackPress = () => {
    navigation.navigate('Feedback' as never);
  };

  const handleAdFreePress = () => {
    navigation.navigate('AdFree' as never);
  };


  const handleNotificationSettingsPress = () => {
    navigation.navigate('NotificationSettings' as never);
  };

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Error', 'Could not open link. Please try again.');
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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCreateAccount = () => {
    Alert.prompt(
      'Create Account',
      'Enter your email address to create an account and save your data:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create Account', 
          onPress: async (email) => {
            if (!email) {
              Alert.alert('Error', 'Please enter a valid email address');
              return;
            }

            if (!validateEmail(email)) {
              Alert.alert('Error', 'Please enter a valid email address (e.g., user@example.com)');
              return;
            }
            
            Alert.prompt(
              'Create Password',
              'Enter a password for your account:',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Create Account', 
                  onPress: async (password) => {
                    if (!password || password.length < 6) {
                      Alert.alert('Error', 'Password must be at least 6 characters');
                      return;
                    }
                    
                    const result = await convertGuestToUser(email, password, 'Guest User');
                    if (result.success) {
                      Alert.alert('Success', 'Account created successfully! Your data has been saved.');
                    } else {
                      Alert.alert('Error', result.error || 'Failed to create account');
                    }
                  }
                }
              ],
              'secure-text'
            );
          }
        }
      ],
      'plain-text',
      '',
      'email-address'
    );
  };

  const renderThemeOption = (themeOption: 'light' | 'dark' | 'system', label: string, description: string) => {
    const isSelected = theme === themeOption;
    
    return (
      <TouchableOpacity
        style={[
          styles.themeOption,
          isSelected && styles.selectedThemeOption,
          { backgroundColor: isSelected ? colors.accent + '20' : colors.cardBackground }
        ]}
        onPress={() => setTheme(themeOption)}
      >
        <View style={styles.themeOptionContent}>
          <View style={styles.themeOptionHeader}>
            <Text style={[styles.themeOptionLabel, { color: colors.text }]}>
              {label}
            </Text>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
            )}
          </View>
          <Text style={[styles.themeOptionDescription, { color: colors.textSecondary }]}>
            {description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Create styles with access to colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.lg,
      paddingHorizontal: SPACING.md,
      borderBottomWidth: 1,
    },
    title: {
      ...TYPOGRAPHY.h1,
      textAlign: 'center',
    },
    subtitle: {
      ...TYPOGRAPHY.h3,
      textAlign: 'center',
      marginTop: SPACING.xs,
    },
    scrollContent: {
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.xl * 2, // Add extra bottom padding for footer
    },
    section: {
      marginBottom: SPACING.xl,
      backgroundColor: colors.cardBackground,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      ...SHADOWS.small,
    },
    sectionTitle: {
      ...TYPOGRAPHY.h2,
      marginBottom: SPACING.md,
      fontWeight: '600',
    },
    settingInfo: {
      flex: 1,
      marginRight: SPACING.md,
    },
    settingLabel: {
      ...TYPOGRAPHY.h4,
      marginBottom: SPACING.xs,
    },
    settingDescription: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
    },
    themeOption: {
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.sm,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
    },
    selectedThemeOption: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    themeOptionContent: {
      flexDirection: 'column',
    },
    themeOptionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    themeOptionLabel: {
      ...TYPOGRAPHY.h4,
    },
    themeOptionDescription: {
      ...TYPOGRAPHY.caption,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      ...SHADOWS.small,
    },
    toggleButton: {
      width: 40,
      height: 40,
      borderRadius: BORDER_RADIUS.lg,
      justifyContent: 'center',
      alignItems: 'center',
      ...SHADOWS.small,
    },
    currentThemeInfo: {
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      ...SHADOWS.small,
    },
    currentThemeLabel: {
      ...TYPOGRAPHY.h4,
      marginBottom: SPACING.xs,
    },
    currentThemeDescription: {
      ...TYPOGRAPHY.caption,
    },
    supportIcon: {
      width: 40,
      height: 40,
      borderRadius: BORDER_RADIUS.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Account section styles
    accountHeader: {
      alignItems: 'center',
      marginBottom: SPACING.lg,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
    },
    avatarContainer: {
      marginBottom: SPACING.md,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
    },
    accountName: {
      ...TYPOGRAPHY.h3,
      marginBottom: SPACING.xs,
    },
    accountEmail: {
      ...TYPOGRAPHY.body,
    },
    inputContainer: {
      marginBottom: SPACING.md,
    },
    label: {
      ...TYPOGRAPHY.caption,
      marginBottom: SPACING.xs,
      fontWeight: '600',
    },
    input: {
      ...TYPOGRAPHY.body,
      borderWidth: 1,
      borderRadius: 8,
      padding: SPACING.sm,
    },
    button: {
      borderRadius: 8,
      padding: SPACING.md,
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      ...TYPOGRAPHY.button,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
    },
    secondaryButtonText: {
      fontWeight: '600',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      ...TYPOGRAPHY.body,
      marginLeft: SPACING.sm,
    },
    settingRowWithSwitch: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING.sm,
      ...SHADOWS.small,
    },
    settingInfoWithSwitch: {
      flex: 1,
      marginRight: SPACING.md,
    },
  });

  return (
    <SafeAreaView style={{ ...styles.container, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Customize your app experience
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Account Section - Enhanced */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          
          {authState.isGuest ? (
            <>
              <View style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Guest Mode
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    You're browsing as a guest. Sign in to sync your data and purchases across devices (optional).
                  </Text>
                </View>
                <View style={[styles.supportIcon, { backgroundColor: '#34C759' + '20' }]}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color="#34C759" 
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}
                onPress={() => navigation.navigate('Auth' as never)}
              >
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Sign In / Create Account
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    Sync purchases and favorites across all your devices
                  </Text>
                </View>
                <View style={[styles.supportIcon, { backgroundColor: colors.accent + '20' }]}>
                  <Ionicons 
                    name="log-in" 
                    size={20} 
                    color={colors.accent} 
                  />
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Account Header */}
              <View style={[styles.accountHeader, { borderBottomColor: colors.border }]}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={30} color={colors.textSecondary} />
                  </View>
                </View>
                <Text style={[styles.accountName, { color: colors.text }]}>
                  {authState.user?.displayName || 'No name set'}
                </Text>
                <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>
                  {authState.user?.email}
                </Text>
              </View>

              {/* Profile Editing */}
              {isEditingProfile ? (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.text }]}>Display Name</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Enter your display name"
                      placeholderTextColor={colors.textSecondary}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.accent }, isLoading && styles.buttonDisabled]}
                    onPress={handleUpdateProfile}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={colors.background} />
                        <Text style={[styles.loadingText, { color: colors.background }]}>Saving...</Text>
                      </View>
                    ) : (
                      <Text style={[styles.buttonText, { color: colors.background }]}>Save Changes</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton, { borderColor: colors.accent }]}
                    onPress={() => setIsEditingProfile(false)}
                  >
                    <Text style={[styles.buttonText, styles.secondaryButtonText, { color: colors.accent }]}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}
                  onPress={() => setIsEditingProfile(true)}
                >
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>
                      Edit Profile
                    </Text>
                    <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      Update your display name and account information
                    </Text>
                  </View>
                  <View style={[styles.supportIcon, { backgroundColor: colors.accent + '20' }]}>
                    <Ionicons 
                      name="create-outline" 
                      size={20} 
                      color={colors.accent} 
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* Account Settings */}
              <View style={[styles.settingRowWithSwitch, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.settingInfoWithSwitch}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Stay Logged In
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
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

              {/* Account Actions */}
              <TouchableOpacity
                style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}
                onPress={handleSignOut}
              >
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Sign Out
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    Sign out of your account
                  </Text>
                </View>
                <View style={[styles.supportIcon, { backgroundColor: '#FF3B30' + '20' }]}>
                  <Ionicons 
                    name="log-out" 
                    size={20} 
                    color="#FF3B30" 
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}
                onPress={handleDeleteAccount}
              >
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>
                    Delete Account
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    Permanently delete your account and all data
                  </Text>
                </View>
                <View style={[styles.supportIcon, { backgroundColor: '#FF3B30' + '20' }]}>
                  <Ionicons 
                    name="trash-outline" 
                    size={20} 
                    color="#FF3B30" 
                  />
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          
          {renderThemeOption(
            'light',
            'Light Mode',
            'Use light colors for better visibility in bright environments'
          )}
          
          {renderThemeOption(
            'dark',
            'Dark Mode',
            'Use dark colors for better visibility in low-light environments'
          )}
          
          {renderThemeOption(
            'system',
            'System Default',
            'Automatically follow your device\'s theme setting'
          )}
        </View>

        {/* Notifications Section - Only show for authenticated users */}
        {!authState.isGuest && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
            
            <TouchableOpacity
              style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}
              onPress={handleNotificationSettingsPress}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Daily News Updates
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Get notified about the latest cybersecurity news
                </Text>
              </View>
              <View style={[styles.supportIcon, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={colors.accent}
                />
              </View>
            </TouchableOpacity>
          </View>
        )}


        {/* Ad-Free Section - Available for ALL users (Apple IAP compliance) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ad-Free Access</Text>
          
          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}
            onPress={handleAdFreePress}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                {isAdFree ? 'Ad-Free Active' : 'Go Ad-Free'}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {isAdFree 
                  ? 'You have ad-free access - thank you for your support!'
                  : 'Remove all ads and support the app development'
                }
              </Text>
            </View>
            <View style={[styles.supportIcon, { backgroundColor: isAdFree ? '#34C759' + '20' : colors.accent + '20' }]}>
              <Ionicons 
                name={isAdFree ? "checkmark-circle" : "shield-checkmark"} 
                size={20} 
                color={isAdFree ? "#34C759" : colors.accent} 
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
          
          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}
            onPress={handleSupportPress}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Support Cybersimply
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Help us keep the app running with donations and support
              </Text>
            </View>
            <View style={[styles.supportIcon, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons 
                name="heart" 
                size={20} 
                color={colors.accent} 
              />
            </View>
          </TouchableOpacity>

          {!authState.isGuest && (
            <TouchableOpacity
              style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}
              onPress={handleFeedbackPress}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Send Feedback
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Report bugs or suggest features
                </Text>
              </View>
              <View style={[styles.supportIcon, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons 
                  name="chatbubble-outline" 
                  size={20} 
                  color={colors.accent} 
                />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Legal</Text>
          
          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}
            onPress={() => handleOpenLink('https://cybersimply.notion.site/CyberSimply-Terms-of-Use-EULA-28c47fbd7cc2808ca354c8425c321a34')}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Terms of Use
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                View our terms of service and end user license agreement
              </Text>
            </View>
            <View style={[styles.supportIcon, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons 
                name="document-text-outline" 
                size={20} 
                color={colors.accent} 
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}
            onPress={() => handleOpenLink('https://cybersimply.notion.site/CyberSimply-Privacy-Policy-27847fbd7cc280988b72d8c00f3af9d7')}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Privacy Policy
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Learn how we collect, use, and protect your data
              </Text>
            </View>
            <View style={[styles.supportIcon, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons 
                name="shield-outline" 
                size={20} 
                color={colors.accent} 
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Current Theme Info */}
        <View style={[styles.currentThemeInfo, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.currentThemeLabel, { color: colors.text }]}>
            Current Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
          </Text>
          <Text style={[styles.currentThemeDescription, { color: colors.textSecondary }]}>
            {isDark ? 'Dark mode is active' : 'Light mode is active'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
