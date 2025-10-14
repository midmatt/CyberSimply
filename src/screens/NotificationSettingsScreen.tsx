import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { notificationService, NotificationSettings } from '../services/notificationService';
import { TYPOGRAPHY, SPACING } from '../constants';

export function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const { authState } = useSupabase();
  const navigation = useNavigation();
  
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    time: '09:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const notificationSettings = await notificationService.getNotificationSettings();
      setSettings(notificationSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    setIsUpdating(true);
    try {
      const result = await notificationService.updateNotificationSettings({ enabled });
      if (result.success) {
        setSettings(prev => ({ ...prev, enabled }));
        if (enabled) {
          Alert.alert(
            'Notifications Enabled',
            'You\'ll receive daily cybersecurity news updates at 9:00 AM.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Notifications Disabled',
            'You won\'t receive daily news updates anymore.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to update notification settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTimeChange = async (newTime: string) => {
    setIsUpdating(true);
    try {
      const result = await notificationService.updateNotificationSettings({ time: newTime });
      if (result.success) {
        setSettings(prev => ({ ...prev, time: newTime }));
        Alert.alert(
          'Time Updated',
          `Daily notifications will now be sent at ${newTime}.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update notification time');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification time');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      const result = await notificationService.sendTestNotification();
      if (result.success) {
        Alert.alert(
          'Test Notification Sent',
          'Check your notification panel for the test notification.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send test notification');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const showTimePicker = () => {
    Alert.alert(
      'Select Notification Time',
      'Choose when you\'d like to receive your daily cybersecurity news update.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '6:00 AM', onPress: () => handleTimeChange('06:00') },
        { text: '7:00 AM', onPress: () => handleTimeChange('07:00') },
        { text: '8:00 AM', onPress: () => handleTimeChange('08:00') },
        { text: '9:00 AM', onPress: () => handleTimeChange('09:00') },
        { text: '10:00 AM', onPress: () => handleTimeChange('10:00') },
        { text: '11:00 AM', onPress: () => handleTimeChange('11:00') },
        { text: '12:00 PM', onPress: () => handleTimeChange('12:00') },
        { text: '1:00 PM', onPress: () => handleTimeChange('13:00') },
        { text: '2:00 PM', onPress: () => handleTimeChange('14:00') },
        { text: '3:00 PM', onPress: () => handleTimeChange('15:00') },
        { text: '4:00 PM', onPress: () => handleTimeChange('16:00') },
        { text: '5:00 PM', onPress: () => handleTimeChange('17:00') },
        { text: '6:00 PM', onPress: () => handleTimeChange('18:00') },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: SPACING.sm,
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
      minWidth: 40,
      minHeight: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.text,
      fontWeight: '600',
    },
    headerSpacer: {
      width: 40,
    },
    content: {
      flex: 1,
      padding: SPACING.lg,
    },
    section: {
      marginBottom: SPACING.xl,
    },
    sectionTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.text,
      marginBottom: SPACING.md,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    settingInfo: {
      flex: 1,
      marginRight: SPACING.md,
    },
    settingTitle: {
      ...TYPOGRAPHY.body,
      color: colors.text,
      fontWeight: '600',
      marginBottom: SPACING.xs,
    },
    settingDescription: {
      ...TYPOGRAPHY.caption,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    timeDisplay: {
      ...TYPOGRAPHY.body,
      color: colors.accent,
      fontWeight: '600',
    },
    testButton: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      padding: SPACING.md,
      alignItems: 'center',
      marginTop: SPACING.md,
    },
    testButtonText: {
      ...TYPOGRAPHY.button,
      color: colors.background,
      fontWeight: '600',
    },
    infoCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: SPACING.lg,
    },
    infoTitle: {
      ...TYPOGRAPHY.h4,
      color: colors.text,
      marginBottom: SPACING.sm,
    },
    infoText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      marginTop: SPACING.md,
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Guest users cannot access notification settings
  if (authState.isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="notifications-off-outline" size={60} color={colors.textSecondary} />
          <Text style={[styles.loadingText, { textAlign: 'center', marginTop: SPACING.lg }]}>
            Create an account to enable notifications
          </Text>
          <Text style={[styles.loadingText, { textAlign: 'center', marginTop: SPACING.sm, fontSize: 14 }]}>
            Guest accounts have limited features
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily News Updates</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📰 Stay Informed</Text>
            <Text style={styles.infoText}>
              Get a daily notification with the latest cybersecurity news and insights. 
              Never miss important security updates that could affect you or your organization.
            </Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive daily cybersecurity news updates
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={handleToggleNotifications}
              disabled={isUpdating}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={settings.enabled ? colors.background : colors.textSecondary}
            />
          </View>

          {settings.enabled && (
            <>
              <TouchableOpacity 
                style={styles.settingItem} 
                onPress={showTimePicker}
                disabled={isUpdating}
                activeOpacity={0.7}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Notification Time</Text>
                  <Text style={styles.settingDescription}>
                    Choose when to receive your daily update
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.timeDisplay}>
                    {new Date(`2000-01-01T${settings.time}`).toLocaleTimeString([], { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </Text>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={colors.textSecondary} 
                    style={{ marginLeft: SPACING.xs }}
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.testButton} 
                onPress={handleTestNotification}
                disabled={isUpdating}
                activeOpacity={0.8}
              >
                <Text style={styles.testButtonText}>Send Test Notification</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Control</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🔒 Your Privacy Matters</Text>
            <Text style={styles.infoText}>
              • Notifications are sent locally from your device{'\n'}
              • No personal data is collected or shared{'\n'}
              • You can disable notifications anytime{'\n'}
              • All notification settings are stored locally on your device
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
