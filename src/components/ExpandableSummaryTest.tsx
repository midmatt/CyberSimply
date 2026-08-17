import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ExpandableSummary } from './ExpandableSummary';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../constants';

export function ExpandableSummaryTest() {
  const { colors } = useTheme();

  const shortText = "This is a short summary that should not show a Read More button.";
  
  const longText = "This is a very long summary that should definitely show a Read More button because it contains many words and sentences that will exceed the maximum number of lines allowed in the truncated view. This text is intentionally long to test the expandable functionality and ensure that the Read More button appears when needed. The component should automatically detect that this text is too long and provide the user with the ability to expand it to see the full content. This is important for maintaining a clean and organized user interface while still allowing users to access all the information they need.";

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: SPACING.md,
    },
    title: {
      ...TYPOGRAPHY.h2,
      color: colors.textPrimary,
      marginBottom: SPACING.lg,
    },
    section: {
      marginBottom: SPACING.xl,
    },
    sectionTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.textPrimary,
      marginBottom: SPACING.md,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>ExpandableSummary Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Short Text (No Read More)</Text>
        <ExpandableSummary 
          text={shortText}
          maxLines={3}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Long Text (With Read More)</Text>
        <ExpandableSummary 
          text={longText}
          maxLines={3}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Long Text (2 Lines Max)</Text>
        <ExpandableSummary 
          text={longText}
          maxLines={2}
        />
      </View>
    </ScrollView>
  );
}
