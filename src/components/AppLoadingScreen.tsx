import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  Easing,
  StyleSheet,
  useColorScheme,
} from 'react-native';

const LOGO_SIZE = 96;
const RING_SIZE = LOGO_SIZE + 28;

interface AppLoadingScreenProps {
  message?: string;
}

/**
 * Boot screen shown before the theme and auth state resolve.
 *
 * Deliberately does not use `useTheme` — it renders in the window where that
 * context may not be ready yet, which is the very condition it exists to cover.
 * Colours come from the system scheme instead.
 *
 * The pulsing ring reads as progress without a spinner: it expands and fades on
 * a loop behind the mark while the mark itself breathes. Both animations are
 * transform/opacity only, so they run on the native driver and keep moving even
 * while the JS thread is busy doing the startup work.
 */
export function AppLoadingScreen({ message = 'Loading' }: AppLoadingScreenProps) {
  const isDark = useColorScheme() === 'dark';
  const ring = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ringLoop = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );

    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    ringLoop.start();
    breatheLoop.start();

    return () => {
      ringLoop.stop();
      breatheLoop.stop();
    };
  }, [ring, breathe]);

  const background = isDark ? '#000000' : '#ffffff';
  const textColor = isDark ? '#8E8E93' : '#6C6C70';
  const accent = '#FF6B35';

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stage: {
      width: RING_SIZE,
      height: RING_SIZE,
      justifyContent: 'center',
      alignItems: 'center',
    },
    ring: {
      position: 'absolute',
      width: RING_SIZE,
      height: RING_SIZE,
      borderRadius: RING_SIZE / 2,
      borderWidth: 2,
      borderColor: accent,
    },
    logo: {
      width: LOGO_SIZE,
      height: LOGO_SIZE,
      borderRadius: 22,
    },
    message: {
      marginTop: 28,
      fontSize: 15,
      fontWeight: '500',
      color: textColor,
      letterSpacing: 0.2,
    },
  });

  return (
    <View style={styles.container} accessible accessibilityRole="progressbar" accessibilityLabel={message}>
      <View style={styles.stage}>
        <Animated.View
          style={[
            styles.ring,
            {
              opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
              transform: [
                { scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.45] }) },
              ],
            },
          ]}
        />

        <Animated.View
          style={{
            transform: [
              { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
            ],
          }}
        >
          <Image
            source={
              isDark
                ? require('../../assets/icons/cs-logo-dark.png')
                : require('../../assets/icons/ios-light.png')
            }
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
