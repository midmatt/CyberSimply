import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DesktopSidebar } from '../components/DesktopSidebar';
import { DesktopHeader } from '../components/DesktopHeader';

interface DesktopLayoutProps {
  children: React.ReactNode;
  currentRoute?: string;
  onNavigate?: (route: string) => void;
}

export function DesktopLayout({ children, currentRoute, onNavigate }: DesktopLayoutProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.layout}>
        {/* Left Sidebar */}
        <View style={styles.sidebar}>
          <DesktopSidebar currentRoute={currentRoute} onNavigate={onNavigate} />
        </View>
        
        {/* Main Content Area */}
        <View style={styles.mainContent}>
          <DesktopHeader />
          <View style={styles.content}>
            {children}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  sidebar: {
    width: 280,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
    minHeight: '100vh',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    padding: 24,
    overflow: 'auto',
  },
});
