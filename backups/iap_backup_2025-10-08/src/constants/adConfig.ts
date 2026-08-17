// Ad and Donation Configuration
// Update these values with your actual API keys and configuration

export const AD_CONFIG = {
  // Google AdMob Configuration
  ADMOB: {
    // Production IDs - Replace with your actual AdMob IDs
    BANNER_AD_UNIT_ID: 'ca-app-pub-1846982089045102/1234567890', // Replace with your actual banner ID
    INTERSTITIAL_AD_UNIT_ID: 'ca-app-pub-1846982089045102/0987654321', // Replace with your actual interstitial ID
    REWARDED_AD_UNIT_ID: 'ca-app-pub-1846982089045102/1122334455', // Replace with your actual rewarded ID
    
    // Test IDs for development (uncomment for testing)
    // BANNER_AD_UNIT_ID: 'ca-app-pub-3940256099942544/2934735716', // Google test banner ID
    // INTERSTITIAL_AD_UNIT_ID: 'ca-app-pub-3940256099942544/4414689103', // Google test interstitial ID
    // REWARDED_AD_UNIT_ID: 'ca-app-pub-3940256099942544/5224354917', // Google test rewarded ID
    
    // Ad display settings
    SHOW_BANNER_ADS: true,
    SHOW_INTERSTITIAL_ADS: true,
    SHOW_REWARDED_ADS: true,
    
    // Ad frequency settings
    BANNER_AD_FREQUENCY: 1, // Show banner ad every N articles
    INTERSTITIAL_AD_FREQUENCY: 5, // Show interstitial ad every N article views
    REWARDED_AD_FREQUENCY: 10, // Show rewarded ad every N article views
    
    // Test mode (set to false for production)
    TEST_MODE: true,
  },
  
  // Donation Configuration
  DONATIONS: {
    // Buy Me a Coffee
    BUY_ME_A_COFFEE_URL: 'https://www.buymeacoffee.com/cybersimply',
    
    // Support features
    ENABLE_DONATIONS: true,
    SHOW_DONATION_PROMPT: true,
    DONATION_PROMPT_FREQUENCY: 3, // Show donation prompt every N app launches
  },
  
  // App monetization settings
  MONETIZATION: {
    // Premium features
    ENABLE_PREMIUM_FEATURES: false,
    PREMIUM_PRICE: 4.99, // Monthly subscription price
    
    // Ad-free option
    ENABLE_AD_FREE_OPTION: true,
    AD_FREE_PRICE: 2.99, // Monthly ad-free price
    
    // Revenue sharing
    REVENUE_SHARE_PERCENTAGE: 70, // Percentage of ad revenue to keep
  },
  
  // Analytics and tracking
  ANALYTICS: {
    ENABLE_AD_ANALYTICS: true,
    ENABLE_DONATION_ANALYTICS: true,
    TRACK_USER_ENGAGEMENT: true,
    TRACK_AD_PERFORMANCE: true,
  },
};

// Ad placement strategy
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

// Donation prompt messages
export const DONATION_MESSAGES = {
  WELCOME: 'Welcome to CyberSimply News! 🛡️',
  SUPPORT_REQUEST: 'Help us keep CyberSimply free and accessible for everyone.',
  BENEFITS: 'Your support helps us:\n• Maintain free access\n• Improve AI summaries\n• Add new features\n• Expand coverage',
  CALL_TO_ACTION: 'Consider supporting us with a small donation!',
  THANK_YOU: 'Thank you for supporting CyberSimply! 🙏',
};

// Ad content categories for targeting
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

// Ad display rules
export const AD_RULES = {
  MIN_ARTICLES_BEFORE_AD: 2,
  MAX_ADS_PER_SCREEN: 3,
  AD_REFRESH_INTERVAL: 300000, // 5 minutes in milliseconds
  USER_EXPERIENCE_PRIORITY: true, // Don't show too many ads
};
