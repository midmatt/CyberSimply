import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useSupabase } from '../context/SupabaseContext';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../constants';

export function SupabaseTest() {
  const { colors } = useTheme();
  const {
    authState,
    signIn,
    signUp,
    signOut,
    userSettings,
    updateUserSettings,
    trackEvent,
    trackArticleView,
  } = useSupabase();

  const [testEmail] = useState('test@example.com');
  const [testPassword] = useState('testpassword123');

  const handleSignUp = async () => {
    const result = await signUp(testEmail, testPassword, 'Test User');
    Alert.alert('Sign Up', result.success ? 'Success!' : `Error: ${result.error}`);
  };

  const handleSignIn = async () => {
    const result = await signIn(testEmail, testPassword);
    Alert.alert('Sign In', result.success ? 'Success!' : `Error: ${result.error}`);
  };

  const handleSignOut = async () => {
    const result = await signOut();
    Alert.alert('Sign Out', result.success ? 'Success!' : `Error: ${result.error}`);
  };

  const handleUpdateSettings = async () => {
    const result = await updateUserSettings({
      theme: 'dark',
      notificationsEnabled: false,
    });
    Alert.alert('Update Settings', result.success ? 'Success!' : `Error: ${result.error}`);
  };

  const handleTrackEvent = async () => {
    await trackEvent('test_event', { testData: 'Hello Supabase!' });
    Alert.alert('Analytics', 'Event tracked successfully!');
  };

  const handleTrackArticleView = async () => {
    await trackArticleView('test-article-123', 30);
    Alert.alert('Analytics', 'Article view tracked successfully!');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: SPACING.md,
      backgroundColor: colors.background,
    },
    title: {
      ...TYPOGRAPHY.h2,
      color: colors.text,
      marginBottom: SPACING.lg,
      textAlign: 'center',
    },
    section: {
      marginBottom: SPACING.lg,
    },
    sectionTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.text,
      marginBottom: SPACING.sm,
    },
    button: {
      backgroundColor: colors.accent,
      padding: SPACING.sm,
      borderRadius: 8,
      marginBottom: SPACING.sm,
    },
    buttonText: {
      ...TYPOGRAPHY.button,
      color: colors.background,
      textAlign: 'center',
    },
    statusText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      marginBottom: SPACING.xs,
    },
    settingsContainer: {
      backgroundColor: colors.cardBackground,
      padding: SPACING.sm,
      borderRadius: 8,
      marginBottom: SPACING.sm,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Supabase Integration Test</Text>

      {/* Authentication Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication Status</Text>
        <Text style={styles.statusText}>
          Loading: {authState.isLoading ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.statusText}>
          Authenticated: {authState.isAuthenticated ? 'Yes' : 'No'}
        </Text>
        {authState.user && (
          <>
            <Text style={styles.statusText}>
              User ID: {authState.user.id}
            </Text>
            <Text style={styles.statusText}>
              Email: {authState.user.email}
            </Text>
            <Text style={styles.statusText}>
              Display Name: {authState.user.displayName || 'Not set'}
            </Text>
            <Text style={styles.statusText}>
              Premium: {authState.user.isPremium ? 'Yes' : 'No'}
            </Text>
          </>
        )}
      </View>

      {/* Authentication Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication Actions</Text>
        {!authState.isAuthenticated ? (
          <>
            <TouchableOpacity style={styles.button} onPress={handleSignUp}>
              <Text style={styles.buttonText}>Sign Up (Test User)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleSignIn}>
              <Text style={styles.buttonText}>Sign In (Test User)</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleSignOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* User Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Settings</Text>
        {userSettings ? (
          <View style={styles.settingsContainer}>
            <Text style={styles.statusText}>
              Theme: {userSettings.theme}
            </Text>
            <Text style={styles.statusText}>
              Notifications: {userSettings.notificationsEnabled ? 'Enabled' : 'Disabled'}
            </Text>
            <Text style={styles.statusText}>
              Email Digest: {userSettings.emailDigestEnabled ? 'Enabled' : 'Disabled'}
            </Text>
            <Text style={styles.statusText}>
              Digest Frequency: {userSettings.digestFrequency}
            </Text>
            <Text style={styles.statusText}>
              AI Summaries: {userSettings.aiSummariesEnabled ? 'Enabled' : 'Disabled'}
            </Text>
            <Text style={styles.statusText}>
              Categories: {userSettings.preferredCategories.join(', ')}
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleUpdateSettings}>
              <Text style={styles.buttonText}>Update Settings (Test)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.statusText}>No settings loaded</Text>
        )}
      </View>

      {/* Analytics Testing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analytics Testing</Text>
        <TouchableOpacity style={styles.button} onPress={handleTrackEvent}>
          <Text style={styles.buttonText}>Track Test Event</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleTrackArticleView}>
          <Text style={styles.buttonText}>Track Article View</Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.statusText}>
          1. Make sure you've set up your Supabase credentials in .env
        </Text>
        <Text style={styles.statusText}>
          2. Run the database schema in your Supabase dashboard
        </Text>
        <Text style={styles.statusText}>
          3. Test authentication by signing up/in
        </Text>
        <Text style={styles.statusText}>
          4. Check that settings are loaded and can be updated
        </Text>
        <Text style={styles.statusText}>
          5. Verify analytics events are being tracked
        </Text>
      </View>
    </ScrollView>
  );
}
