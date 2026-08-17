'use client';

import { useEffect } from 'react';
import { ADSENSE_CLIENT } from '@/lib/config';
import { useAuth } from './AuthProvider';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Turns on AdSense Auto ads (page-level placements). Manual <AdSlot> units
 * still work alongside this once their slot ids are set.
 *
 * AdMob cannot serve on the website — this is the same Google publisher
 * account (`pub-1846982089045102`) using AdSense, which is the web product.
 */
export function AutoAds() {
  const { ready, isAdFree } = useAuth();

  useEffect(() => {
    if (!ready || isAdFree) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({
        google_ad_client: ADSENSE_CLIENT,
        enable_page_level_ads: true,
      });
    } catch {
      // Blocked by an extension or not yet approved. Failures are silent so
      // the rest of the page is unaffected.
    }
  }, [ready, isAdFree]);

  return null;
}
