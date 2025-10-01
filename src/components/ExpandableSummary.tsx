import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../constants';

interface ExpandableSummaryProps {
  text: string;
  maxLines?: number;
  style?: any;
  textStyle?: any;
}

export function ExpandableSummary({ 
  text, 
  maxLines = 3, 
  style, 
  textStyle 
}: ExpandableSummaryProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const [truncatedText, setTruncatedText] = useState(text);
  const [animationValue] = useState(new Animated.Value(0));

  // Function to create a sentence-aware preview
  const buildPreview = React.useCallback((full: string): { preview: string; truncated: boolean } => {
    if (!full) return { preview: '', truncated: false };
    
    // Clean up the text first
    const cleanText = full.replace(/\s+/g, ' ').trim();
    
    // Split into sentences more carefully
    const sentences = cleanText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) return { preview: cleanText, truncated: false };
    
    // Calculate target length based on maxLines
    const targetChars = Math.max(400, (maxLines ?? 3) * 12 * 8); // ~8 chars/word heuristic for better display
    
    let preview = '';
    let totalLength = 0;
    
    for (const sentence of sentences) {
      const sentenceWithSpace = preview ? ' ' + sentence : sentence;
      const newLength = totalLength + sentenceWithSpace.length;
      
      // If adding this sentence would exceed target, stop here
      if (newLength > targetChars && preview.length > 0) {
        break;
      }
      
      preview += sentenceWithSpace;
      totalLength = newLength;
    }
    
    // Ensure preview ends properly
    preview = preview.trim();
    
    // Only add period if we're truncating and it doesn't end with punctuation
    if (preview.length < cleanText.length && !/[.!?]$/.test(preview)) {
      preview += '.';
    }
    
    return { 
      preview, 
      truncated: preview.length < cleanText.length 
    };
  }, [maxLines]);

  // Create preview for collapsed state
  useEffect(() => {
    const { preview, truncated } = buildPreview(text ?? '');
    setTruncatedText(preview);
    setNeedsTruncation(truncated);
    
    console.log('ExpandableSummary: Preview check:', {
      originalLength: text.length,
      previewLength: preview.length,
      needsTruncation: truncated,
      maxLines,
      previewText: preview.substring(0, 100) + (preview.length > 100 ? '...' : '')
    });
  }, [text, buildPreview]);

  // Animate expansion/collapse
  useEffect(() => {
    Animated.timing(animationValue, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, animationValue]);

  const toggleExpansion = () => {
    console.log('ExpandableSummary: Toggling expansion from', isExpanded, 'to', !isExpanded);
    setIsExpanded(!isExpanded);
  };

  const styles = StyleSheet.create({
    container: {
      ...style,
    },
    text: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
      lineHeight: TYPOGRAPHY.body.lineHeight * 1.3,
      ...textStyle,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: SPACING.xs,
      paddingVertical: SPACING.xs,
      alignSelf: 'flex-start',
    },
    buttonText: {
      ...TYPOGRAPHY.caption,
      color: colors.accent,
      fontWeight: '600',
      marginRight: SPACING.xs,
    },
    buttonIcon: {
      transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
    },
  });

  return (
    <View style={styles.container}>
      {!needsTruncation ? (
        <Text style={styles.text}>{text}</Text>
      ) : (
        <>
          <Text style={styles.text}>
            {isExpanded ? text : truncatedText}
          </Text>
          <TouchableOpacity style={styles.button} onPress={toggleExpansion}>
            <Text style={styles.buttonText}>{isExpanded ? 'Read Less' : 'Read More'}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.accent} style={styles.buttonIcon} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}