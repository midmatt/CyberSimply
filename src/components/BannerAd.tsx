import React from 'react';
import { AdMobBannerComponent } from './AdMobBanner';
import type { AdBannerData } from '../services/adService';

interface BannerAdProps {
  style?: any;
  onAdPress?: (adData: AdBannerData) => void;
}

/** Thin wrapper kept for older imports — renders the real AdMob banner. */
export function BannerAd({ onAdPress }: BannerAdProps) {
  return (
    <AdMobBannerComponent
      size="banner"
      onAdPress={onAdPress ? () => onAdPress({
        id: 'banner',
        title: '',
        description: '',
        cta: '',
        category: 'general',
      }) : undefined}
    />
  );
}
