import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../constants';
import { Linking } from 'react-native';

export function FeedbackScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendFeedback = async () => {
    if (!feedback.trim()) {
      Alert.alert('Error', 'Please enter your feedback before sending.');
      return;
    }

    if (feedback.trim().length < 10) {
      Alert.alert('Error', 'Please provide more detailed feedback (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      const deviceInfo = `Platform: ${Platform.OS} ${Platform.Version}`;
      const subject = 'CyberSimply App Feedback';
      const body = `Feedback:\n\n${feedback.trim()}\n\n---\nDevice Info: ${deviceInfo}\nTimestamp: ${new Date().toISOString()}`;
      
      const emailUrl = `mailto:mvella11@icloud.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      await Linking.openURL(emailUrl);
      
      // Clear feedback after successful open
      setFeedback('');
      
      Alert.alert(
        'Email App Opened',
        'Please send the email from your email app to complete your feedback submission.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error opening email:', error);
      Alert.alert(
        'Error',
        'Could not open email app. Please send your feedback directly to:\nmvella11@icloud.com',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: SPACING.xs,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.sm,
    },
    headerTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.text,
      fontWeight: '600',
      fontSize: 18,
    },
    headerSpacer: {
      width: 32,
    },
    content: {
      flex: 1,
      padding: SPACING.lg,
    },
    iconContainer: {
      alignItems: 'center',
      marginBottom: SPACING.xl,
    },
    icon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.accent + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    title: {
      ...TYPOGRAPHY.h2,
      color: colors.text,
      textAlign: 'center',
      marginBottom: SPACING.sm,
      fontWeight: '600',
    },
    description: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    inputContainer: {
      marginBottom: SPACING.xl,
    },
    label: {
      ...TYPOGRAPHY.h4,
      color: colors.text,
      marginBottom: SPACING.sm,
      fontWeight: '600',
    },
    textInput: {
      ...TYPOGRAPHY.body,
      color: colors.text,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: SPACING.md,
      minHeight: 120,
      maxHeight: 200,
      textAlignVertical: 'top',
      fontSize: 16,
      lineHeight: 22,
    },
    characterCount: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      textAlign: 'right',
      marginTop: SPACING.xs,
    },
    button: {
      backgroundColor: colors.accent,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    buttonDisabled: {
      opacity: 0.6,
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
    infoContainer: {
      backgroundColor: colors.surface,
      padding: SPACING.md,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.accent,
      marginTop: SPACING.lg,
    },
    infoText: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={colors.background} 
      />
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Feedback</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.iconContainer}>
            <View style={styles.icon}>
              <Ionicons name="chatbubble-outline" size={40} color={colors.accent} />
            </View>
            <Text style={styles.title}>We'd Love Your Feedback</Text>
            <Text style={styles.description}>
              Found a bug? Have a feature request? We're always working to improve CyberSimply.
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Your Feedback</Text>
            <TextInput
              style={styles.textInput}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Describe the issue, suggest a feature, or share your thoughts..."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={1000}
              autoCapitalize="sentences"
              autoCorrect={true}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {feedback.length}/1000 characters
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSendFeedback}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Opening Email...' : 'Send Feedback'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Your feedback will be sent to the developer via email. Please include as much detail as possible to help us address your concerns or implement your suggestions.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
