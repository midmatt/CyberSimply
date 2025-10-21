import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../context/SupabaseContext';

interface DesktopHeaderProps {
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

export function DesktopHeader({ onSearch, searchQuery = '' }: DesktopHeaderProps) {
  const { colors } = useTheme();
  const { authState } = useSupabase();
  const [searchValue, setSearchValue] = useState(searchQuery);

  const handleSearch = (text: string) => {
    setSearchValue(text);
    if (onSearch) {
      onSearch(text);
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: '#e9ecef',
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    leftSection: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchContainer: {
      flex: 1,
      maxWidth: 500,
      marginRight: 24,
    },
    searchInput: {
      backgroundColor: '#f8f9fa',
      borderWidth: 1,
      borderColor: '#e9ecef',
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.textPrimary,
    },
    searchInputFocused: {
      borderColor: colors.accent,
      backgroundColor: '#ffffff',
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      padding: 8,
      marginLeft: 8,
      borderRadius: 6,
    },
    actionButtonActive: {
      backgroundColor: colors.accent + '15',
    },
    userButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 6,
      marginLeft: 8,
    },
    userButtonActive: {
      backgroundColor: colors.accent + '15',
    },
    userText: {
      marginLeft: 8,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    notificationBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#ff4444',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput]}
            placeholder="Search cybersecurity news..."
            placeholderTextColor={colors.textSecondary}
            value={searchValue}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
        </View>

        {/* Right Actions */}
        <View style={styles.rightSection}>
          {/* Notifications */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>

          {/* Profile */}
          <TouchableOpacity style={styles.userButton}>
            <Ionicons name="person-circle-outline" size={24} color={colors.accent} />
            <Text style={styles.userText}>
              {authState?.user?.email?.split('@')[0] || 'Guest'}
            </Text>
          </TouchableOpacity>

          {/* Settings */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
