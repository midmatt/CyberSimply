import { Category } from '../types';

export const COLORS = {
  // Light mode colors
  light: {
    primary: '#ff7613',
    background: '#ffffff',
    text: '#000000',
    textSecondary: '#666666',
    textPrimary: '#000000',
    border: '#e0e0e0',
    card: '#ffffff',
    cardBackground: '#ffffff',
    shadow: '#000000',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    accent: '#ff7613',
    surface: '#f5f5f5',
    white: '#ffffff',
  },
  // Dark mode colors
  dark: {
    primary: '#ff8a3d',
    background: '#121212',
    text: '#ffffff',
    textSecondary: '#cccccc', // Even better contrast - lighter grey
    textPrimary: '#ffffff',
    border: '#333333', // Better border contrast
    card: '#1e1e1e',
    cardBackground: '#1e1e1e',
    shadow: '#000000',
    success: '#66bb6a',
    warning: '#ffb74d',
    error: '#ef5350',
    info: '#64b5f6',
    accent: '#ff8a3d',
    surface: '#1e1e1e',
    white: '#ffffff',
  },
};

// Theme type for type safety
export type Theme = 'light' | 'dark' | 'system';

// Get current theme colors (will be updated by context)
export const getThemeColors = (isDark: boolean) => {
  return isDark ? COLORS.dark : COLORS.light;
};

export const CATEGORIES: Category[] = [
  {
    id: '1',
    name: 'Scams to Avoid',
    icon: 'shield-outline',
    color: '#F44336',
    description: 'Learn about common scams and how to avoid them',
  },
  {
    id: '2',
    name: 'Privacy Tips',
    icon: 'lock-closed',
    color: '#2196F3',
    description: 'Tips to protect your personal information online',
  },
  {
    id: '3',
    name: 'Major Breaches',
    icon: 'warning',
    color: '#FF9800',
    description: 'Important security breaches and their impact',
  },
  {
    id: '4',
    name: 'Security Basics',
    icon: 'shield-checkmark',
    color: '#4CAF50',
    description: 'Fundamental cybersecurity practices for everyone',
  },
];

export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999, // Add missing full border radius
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.light.shadow, // Assuming light mode shadow is used for small shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  medium: {
    shadowColor: COLORS.light.shadow, // Assuming light mode shadow is used for medium shadow
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6.27,
    elevation: 8,
  },
  large: {
    shadowColor: COLORS.light.shadow, // Assuming light mode shadow is used for large shadow
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10.32,
    elevation: 12,
  },
};

export const API_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  serper: 'https://google.serper.dev/search',
  newsApi: 'https://newsapi.org/v2/everything',
};

export const SEARCH_QUERIES = {
  cybersecurity: 'latest cybersecurity news site:trustednews.com OR site:securityweek.com OR site:krebsonsecurity.com',
  scams: 'cybersecurity scams phishing latest news',
  privacy: 'cybersecurity privacy protection latest news',
  breaches: 'cybersecurity data breaches latest news',
  basics: 'cybersecurity basics tips latest news',
};
