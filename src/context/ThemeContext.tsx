import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, getThemeColors } from '../constants';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  colors: ReturnType<typeof getThemeColors>;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  
  // Determine if dark mode should be active
  const isDark = theme === 'system' 
    ? systemColorScheme === 'dark'
    : theme === 'dark';
  
  // Get current theme colors
  const colors = getThemeColors(isDark);
  
  // Set theme and save to storage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    // TODO: Save to AsyncStorage when implemented
  };
  
  // Toggle between light and dark (skip system)
  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      // If system, default to light
      setTheme('light');
    }
  };
  
  // Update theme when system color scheme changes
  useEffect(() => {
    if (theme === 'system') {
      // Force re-render when system theme changes
      // This is handled automatically by the isDark calculation
    }
  }, [systemColorScheme, theme]);
  
  const value: ThemeContextType = {
    theme,
    isDark,
    colors,
    setTheme,
    toggleTheme,
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
