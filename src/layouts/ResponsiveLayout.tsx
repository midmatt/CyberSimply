import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { DesktopLayout } from './DesktopLayout';
import { MobileLayout } from './MobileLayout';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  currentRoute?: string;
  onNavigate?: (route: string) => void;
}

const BREAKPOINT_DESKTOP = 1024;

export function ResponsiveLayout({ children, currentRoute, onNavigate }: ResponsiveLayoutProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const updateLayout = () => {
      const { width } = Dimensions.get('window');
      setScreenWidth(width);
      setIsDesktop(width >= BREAKPOINT_DESKTOP && Platform.OS === 'web');
    };

    updateLayout();
    
    const subscription = Dimensions.addEventListener('change', updateLayout);
    
    return () => subscription?.remove();
  }, []);

  // Always use mobile layout for native platforms
  if (Platform.OS !== 'web') {
    return (
      <MobileLayout>
        {children}
      </MobileLayout>
    );
  }

  // Use desktop layout for web on large screens
  if (isDesktop) {
    return (
      <DesktopLayout currentRoute={currentRoute} onNavigate={onNavigate}>
        {children}
      </DesktopLayout>
    );
  }

  // Use mobile layout for web on small screens
  return (
    <MobileLayout>
      {children}
    </MobileLayout>
  );
}
