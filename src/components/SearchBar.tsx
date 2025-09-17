import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = "Search news..." }: SearchBarProps) {
  const { colors } = useTheme();

  const handleClear = () => {
    onChangeText('');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, { 
        backgroundColor: colors.cardBackground, 
        borderColor: colors.border 
      }]}>
        <Ionicons 
          name="search" 
          size={20} 
          color={colors.textSecondary} 
          style={styles.searchIcon} 
        />
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          editable={true}
          multiline={false}
          numberOfLines={1}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {value && value.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    minHeight: 48,
    width: '100%',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'normal',
    lineHeight: 20,
    paddingVertical: 2,
    paddingHorizontal: 4,
    margin: 0,
    textAlignVertical: 'center',
    backgroundColor: 'transparent',
    minHeight: 20,
  },
  clearButton: {
    padding: 2,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 20,
    minHeight: 20,
    marginTop: -2,
  },
});
