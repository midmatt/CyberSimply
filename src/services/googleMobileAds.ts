import { Platform } from 'react-native';

/**
 * Safe accessor for the Google Mobile Ads SDK.
 *
 * Importing `react-native-google-mobile-ads` at module scope calls
 * `TurboModuleRegistry.getEnforcing('RNGoogleMobileAdsModule')` while the module
 * is evaluating, which throws an Invariant Violation on any binary that does not
 * contain the native module — a dev client built before the package was added,
 * Expo Go, or web. Because the ad config was imported from the navigator chain,
 * that throw happened during app boot and took down the whole app rather than
 * just the ads.
 *
 * Loading through `require` inside a try/catch keeps that failure local: callers
 * get `null` and skip ads, and the rest of the app starts normally.
 */
type MobileAdsModule = typeof import('react-native-google-mobile-ads');

let cachedModule: MobileAdsModule | null = null;
let loadAttempted = false;

export function getMobileAds(): MobileAdsModule | null {
  if (loadAttempted) {
    return cachedModule;
  }
  loadAttempted = true;

  if (Platform.OS === 'web') {
    cachedModule = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    cachedModule = require('react-native-google-mobile-ads');
  } catch (error) {
    cachedModule = null;
    console.warn(
      '[AdMob] Native module not found in this binary — ads are disabled. ' +
        'Rebuild the native app (npx expo run:ios / run:android) after installing ' +
        'react-native-google-mobile-ads.',
      error instanceof Error ? error.message : error,
    );
  }

  return cachedModule;
}

export function isMobileAdsAvailable(): boolean {
  return getMobileAds() !== null;
}
