import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { useAdFree } from '../context/AdFreeContext';
import { useNews } from '../context/NewsContext';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';

export function SettingsScreen() {
  const { theme, isDark, colors, setTheme, toggleTheme } = useTheme();
  const { authState, signOut, convertGuestToUser } = useSupabase();
  const { isAdFree } = useAdFree();
  const { clearCacheAndRefresh } = useNews();
  const navigation = useNavigation();

  const handleSupportPress = () => {
    navigation.navigate('Support' as never);
  };

  const handleAdFreePress = () => {
    navigation.navigate('AdFree' as never);
  };

  const handleNotificationSettingsPress = () => {
    navigation.navigate('NotificationSettings' as never);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache & Refresh',
      'This will clear all cached articles and fetch fresh news. This may help fix date display issues.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear & Refresh', 
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCacheAndRefresh();
              Alert.alert('Success', 'Cache cleared and news refreshed successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache and refresh news');
            }
          }
        }
      ]
    );
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
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Customize your app experience
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
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

        {/* Notifications Section */}
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

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Management</Text>
          
          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}
            onPress={handleClearCache}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Clear Cache & Refresh
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Clear cached articles and fetch fresh news
              </Text>
            </View>
            <View style={[styles.supportIcon, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons
                name="refresh-outline"
                size={20}
                color={colors.accent}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          
          {authState.isGuest ? (
            <View style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Guest Mode
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  You're using the app as a guest. Create an account to save your data and make purchases.
                </Text>
              </View>
              <View style={[styles.supportIcon, { backgroundColor: '#FF9500' + '20' }]}>
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color="#FF9500" 
                />
              </View>
            </View>
          ) : null}

          {authState.isGuest && (
            <TouchableOpacity
              style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}
              onPress={handleCreateAccount}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Create Account
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Save your data and enable in-app purchases
                </Text>
              </View>
              <View style={[styles.supportIcon, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons 
                  name="add-circle" 
                  size={20} 
                  color={colors.accent} 
                />
              </View>
            </TouchableOpacity>
          )}

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
        </View>

        {/* Ad-Free Section */}
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
