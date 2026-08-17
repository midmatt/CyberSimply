import { Platform } from 'react-native';

/**
 * Google's public test ad units, inlined rather than read from the SDK's
 * `TestIds`. This file is pulled in from the navigator chain at app boot, and
 * importing the SDK here threw an Invariant Violation on any binary without the
 * native module, crashing the app before the first screen rendered. These values
 * are documented constants and do not change.
 * https://developers.google.com/admob/ios/test-ads
 */
const TEST_UNIT_IDS = {
  BANNER: Platform.select({
    ios: 'ca-app-pub-3940256099942544/2934735716',
    default: 'ca-app-pub-3940256099942544/6300978111',
  }),
  INTERSTITIAL: Platform.select({
    ios: 'ca-app-pub-3940256099942544/4411468910',
    default: 'ca-app-pub-3940256099942544/1033173712',
  }),
  REWARDED: Platform.select({
    ios: 'ca-app-pub-3940256099942544/1712485313',
    default: 'ca-app-pub-3940256099942544/5224354917',
  }),
};

const PLACEHOLDER_UNIT_RE =
  /\/(1234567890|0987654321|1122334455)$|REPLACE_WITH_REAL_|your.?actual/i;

function isPlaceholderUnitId(value: string): boolean {
  return !value || PLACEHOLDER_UNIT_RE.test(value) || !value.includes('/');
}

function resolveUnitId(
  envValue: string | undefined,
  configuredValue: string,
  testId: string,
): string {
  // Always use Google test units in debug builds — never risk invalid traffic.
  if (__DEV__) {
    return testId;
  }

  const candidate = (envValue || configuredValue || '').trim();
  if (isPlaceholderUnitId(candidate)) {
    console.error(
      '[AdMob] Production ad unit ID is missing or still a placeholder. ' +
        'Create real units in AdMob Console → Apps → Ad units, then set ' +
        'EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID / INTERSTITIAL_UNIT_ID / REWARDED_UNIT_ID.',
    );
    // Fall back to test IDs so the SDK still loads; impressions will not earn.
    return testId;
  }

  return candidate;
}

// Production unit IDs. EAS env vars override these when set.
const PRODUCTION_BANNER_UNIT_ID =
  process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID ||
  'ca-app-pub-1846982089045102/9874666491';
const PRODUCTION_INTERSTITIAL_UNIT_ID =
  process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID ||
  'ca-app-pub-1846982089045102/7248503155';
const PRODUCTION_REWARDED_UNIT_ID =
  process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID ||
  'ca-app-pub-1846982089045102/3585398116';

export const AD_CONFIG = {
  ADMOB: {
    APP_ID:
      Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS ||
          'ca-app-pub-1846982089045102~4493578427'
        : process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID ||
          'ca-app-pub-1846982089045102~4493578427',

    BANNER_AD_UNIT_ID: resolveUnitId(
      process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID,
      PRODUCTION_BANNER_UNIT_ID,
      TEST_UNIT_IDS.BANNER,
    ),
    INTERSTITIAL_AD_UNIT_ID: resolveUnitId(
      process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID,
      PRODUCTION_INTERSTITIAL_UNIT_ID,
      TEST_UNIT_IDS.INTERSTITIAL,
    ),
    REWARDED_AD_UNIT_ID: resolveUnitId(
      process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID,
      PRODUCTION_REWARDED_UNIT_ID,
      TEST_UNIT_IDS.REWARDED,
    ),

    SHOW_BANNER_ADS: true,
    SHOW_INTERSTITIAL_ADS: true,
    SHOW_REWARDED_ADS: true,

    BANNER_AD_FREQUENCY: 1,
    INTERSTITIAL_AD_FREQUENCY: 5,
    REWARDED_AD_FREQUENCY: 10,

    // false in release builds so the real SDK path is used
    TEST_MODE: __DEV__,
  },

  DONATIONS: {
    BUY_ME_A_COFFEE_URL: 'https://www.buymeacoffee.com/cybersimply',
    ENABLE_DONATIONS: true,
    SHOW_DONATION_PROMPT: true,
    DONATION_PROMPT_FREQUENCY: 3,
  },

  MONETIZATION: {
    ENABLE_PREMIUM_FEATURES: false,
    PREMIUM_PRICE: 4.99,
    ENABLE_AD_FREE_OPTION: true,
    AD_FREE_PRICE: 2.99,
    REVENUE_SHARE_PERCENTAGE: 70,
  },

  ANALYTICS: {
    ENABLE_AD_ANALYTICS: true,
    ENABLE_DONATION_ANALYTICS: true,
    TRACK_USER_ENGAGEMENT: true,
    TRACK_AD_PERFORMANCE: true,
  },
};

export const AD_PLACEMENT = {
  HOME_SCREEN: {
    BANNER_AFTER_HEADER: true,
    BANNER_AFTER_ARTICLES: false,
    INTERSTITIAL_ON_LAUNCH: false,
  },
  ARCHIVE_SCREEN: {
    BANNER_AFTER_HEADER: true,
    BANNER_AFTER_ARTICLES: true,
  },
  ARTICLE_DETAIL: {
    BANNER_AFTER_CONTENT: true,
    INTERSTITIAL_ON_EXIT: true,
  },
  CATEGORIES_SCREEN: {
    BANNER_AFTER_HEADER: false,
    BANNER_AFTER_CATEGORIES: true,
  },
  FAVORITES_SCREEN: {
    BANNER_AFTER_HEADER: false,
    BANNER_AFTER_ARTICLES: true,
  },
};

export const DONATION_MESSAGES = {
  WELCOME: 'Welcome to CyberSimply News! 🛡️',
  SUPPORT_REQUEST: 'Help us keep CyberSimply free and accessible for everyone.',
  BENEFITS:
    'Your support helps us:\n• Maintain free access\n• Improve AI summaries\n• Add new features\n• Expand coverage',
  CALL_TO_ACTION: 'Consider supporting us with a small donation!',
  THANK_YOU: 'Thank you for supporting CyberSimply! 🙏',
};

export const AD_CATEGORIES = [
  'cybersecurity',
  'privacy',
  'online-safety',
  'digital-security',
  'tech-education',
  'software-tools',
  'vpn-services',
  'password-managers',
  'antivirus-software',
  'security-training',
];

export const AD_RULES = {
  MIN_ARTICLES_BEFORE_AD: 2,
  MAX_ADS_PER_SCREEN: 3,
  AD_REFRESH_INTERVAL: 300000,
  USER_EXPERIENCE_PRIORITY: true,
};
