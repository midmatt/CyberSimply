/**
 * Supabase credentials for the public read-only feed.
 *
 * These mirror `src/constants/supabaseConfig.ts` in the mobile app and point at
 * the same project. The anon key is safe to expose: it is already shipped
 * inside the mobile binary and every table it can reach is protected by RLS.
 * Env vars win so a fork can point at its own project without a code change.
 */
// `||`, not `??`: an unset GitHub Actions secret arrives as an empty string,
// which would otherwise satisfy `??` and produce an unusable client.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uaykrxfhzfkhjwnmvukb.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWtyeGZoemZraGp3bm12dWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjI1ODMsImV4cCI6MjA3MzA5ODU4M30.V4cd5JiLwAgjNUk-VTBicIp52PuH2FAp_UsZMRPlR40';

/**
 * Google AdSense publisher id — same account as AdMob on iOS/Android.
 * Websites cannot host AdMob units; AdSense is the web product for this pub.
 */
export const ADSENSE_CLIENT = 'ca-pub-1846982089045102';

/**
 * Optional manual AdSense unit ids. Auto ads still run without these; set the
 * env vars after creating units in AdSense → Ads → By ad unit.
 */
export const ADSENSE_SLOTS = {
  inFeed: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED || '',
  article: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE || '',
  display: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DISPLAY || '',
};

/**
 * How many recent articles the site builds. The table holds thousands, but the
 * feed only ever shows recent news and every article here becomes a
 * pre-rendered page in the static export.
 */
export const FEED_LIMIT = 96;

export const SITE_NAME = 'CyberSimply';
export const SITE_DESCRIPTION =
  'Cybersecurity news, explained simply. Breaches, scams, vulnerabilities and patches in plain English.';
export const SITE_URL = 'https://cybersimply.com';
