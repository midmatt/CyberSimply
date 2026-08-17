import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';
import { useAdFree } from '../context/AdFreeContext';

interface DesktopSidebarProps {
  currentRoute?: string;
  onNavigate?: (route: string) => void;
}

const navigationItems = [
  { id: 'News', icon: 'newspaper-outline', label: 'Latest News' },
  { id: 'Categories', icon: 'grid-outline', label: 'Categories' },
  { id: 'Favorites', icon: 'star-outline', label: 'Favorites' },
  { id: 'Archive', icon: 'archive-outline', label: 'Archive' },
  { id: 'Settings', icon: 'settings-outline', label: 'Settings' },
];

export function DesktopSidebar({ currentRoute, onNavigate }: DesktopSidebarProps) {
  const { colors } = useTheme();
  const { authState } = useSupabase();
  const { isAdFree } = useAdFree();

  const handleNavigation = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
    },
    logo: {
      marginBottom: 32,
    },
    logoText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    logoSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    navSection: {
      marginBottom: 24,
    },
    navTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 4,
    },
    navItemActive: {
      backgroundColor: colors.accent + '15',
    },
    navIcon: {
      marginRight: 12,
    },
    navLabel: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    navLabelActive: {
      color: colors.accent,
      fontWeight: '600',
    },
    userSection: {
      marginTop: 'auto',
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    userAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    userStatus: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    adFreeBadge: {
      backgroundColor: colors.accent,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginTop: 4,
    },
    adFreeText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#ffffff',
    },
    footer: {
      marginTop: 20,
    },
    footerText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logo}>
        <Text style={styles.logoText}>CyberSimply</Text>
        <Text style={styles.logoSubtext}>Cybersecurity News</Text>
      </View>

      {/* Navigation */}
      <ScrollView style={styles.navSection} showsVerticalScrollIndicator={false}>
        <Text style={styles.navTitle}>Navigation</Text>
        {navigationItems.map((item) => {
          const isActive = currentRoute === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => handleNavigation(item.id)}
            >
              <Ionicons
                name={item.icon as any}
                size={20}
                color={isActive ? colors.accent : colors.textSecondary}
                style={styles.navIcon}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* User Section */}
      <View style={styles.userSection}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={20} color={colors.accent} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {authState?.user?.email || 'Guest User'}
            </Text>
            <Text style={styles.userStatus}>
              {authState?.isAuthenticated ? 'Signed In' : 'Guest Mode'}
            </Text>
            {isAdFree && (
              <View style={styles.adFreeBadge}>
                <Text style={styles.adFreeText}>Ad-Free</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 CyberSimply
          </Text>
        </View>
      </View>
    </View>
  );
}
