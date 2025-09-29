import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { TYPOGRAPHY, SPACING } from '../constants';

type AuthMode = 'signin' | 'signup' | 'forgot';

export function AuthScreen() {
  const { colors } = useTheme();
  const { signIn, signUp, resetPassword, enterGuestMode, authState } = useSupabase();
  
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);

  // Load Stay Logged In preference on component mount
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
    } catch (error) {
      console.error('Error saving stay logged in preference:', error);
      Alert.alert('Error', 'Failed to update preference');
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    const result = await signIn(email, password);
    setIsLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Signed in successfully!');
    } else {
      Alert.alert('Error', result.error || 'Sign in failed');
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const result = await signUp(email, password, displayName);
    setIsLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Account created successfully! Please check your email to verify your account.');
      setMode('signin');
    } else {
      Alert.alert('Error', result.error || 'Sign up failed');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(email);
    setIsLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Password reset email sent! Check your inbox.');
      setMode('signin');
    } else {
      Alert.alert('Error', result.error || 'Password reset failed');
    }
  };

  const handleGuestMode = async () => {
    setIsLoading(true);
    const result = await enterGuestMode();
    setIsLoading(false);

    if (result.success) {
      // Guest mode entered successfully, no need to show alert
      // The app will automatically navigate to the main screen
    } else {
      Alert.alert('Error', result.error || 'Failed to enter guest mode');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      flex: 1,
      padding: SPACING.lg,
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: SPACING.xl,
    },
    title: {
      ...TYPOGRAPHY.h1,
      color: colors.text,
      marginBottom: SPACING.sm,
    },
    subtitle: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    form: {
      marginBottom: SPACING.lg,
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
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      color: colors.text,
      minHeight: 48,
      textAlignVertical: 'center',
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
    },
    passwordInput: {
      flex: 1,
      ...TYPOGRAPHY.body,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      color: colors.text,
      minHeight: 48,
      textAlignVertical: 'center',
    },
    passwordToggle: {
      position: 'absolute',
      right: SPACING.sm,
      padding: SPACING.xs,
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
    guestButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.textSecondary,
      marginTop: SPACING.sm,
    },
    guestButtonText: {
      color: colors.textSecondary,
    },
    linkContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: SPACING.md,
    },
    linkText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
    },
    link: {
      color: colors.accent,
      fontWeight: '600',
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
    stayLoggedInContainer: {
      marginBottom: SPACING.md,
    },
    stayLoggedInRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stayLoggedInInfo: {
      flex: 1,
      marginRight: SPACING.md,
    },
    stayLoggedInLabel: {
      ...TYPOGRAPHY.body,
      color: colors.text,
      fontWeight: '600',
      marginBottom: SPACING.xs,
    },
    stayLoggedInDescription: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      lineHeight: TYPOGRAPHY.caption.lineHeight * 1.2,
    },
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'signin' ? 'Welcome Back' : 
             mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signin' ? 'Sign in to your account' :
             mode === 'signup' ? 'Create a new account to get started' :
             'Enter your email to reset your password'}
          </Text>
        </View>

        <View style={styles.form}>
          {mode === 'signup' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your display name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {mode !== 'forgot' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {mode === 'signup' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {/* Stay Logged In Toggle - only show for sign in mode */}
          {mode === 'signin' && (
            <View style={styles.stayLoggedInContainer}>
              <View style={styles.stayLoggedInRow}>
                <View style={styles.stayLoggedInInfo}>
                  <Text style={styles.stayLoggedInLabel}>Stay Logged In</Text>
                  <Text style={styles.stayLoggedInDescription}>
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
          )}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={mode === 'signin' ? handleSignIn : 
                     mode === 'signup' ? handleSignUp : handleForgotPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Ionicons name="refresh" size={16} color={colors.textSecondary} />
                <Text style={styles.loadingText}>Please wait...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>
                {mode === 'signin' ? 'Sign In' :
                 mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
              </Text>
            )}
          </TouchableOpacity>

          {mode === 'signin' && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setMode('forgot')}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          )}

          {/* Guest Mode Button */}
          <TouchableOpacity
            style={[styles.button, styles.guestButton]}
            onPress={handleGuestMode}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.guestButtonText]}>
              Continue as Guest
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>
            {mode === 'signin' ? "Don't have an account? " :
             mode === 'signup' ? "Already have an account? " :
             "Remember your password? "}
          </Text>
          <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            <Text style={styles.link}>
              {mode === 'signin' ? 'Sign Up' :
               mode === 'signup' ? 'Sign In' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
