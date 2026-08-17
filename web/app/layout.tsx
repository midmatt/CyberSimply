import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { AutoAds } from '@/components/AutoAds';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ADSENSE_CLIENT, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Cybersecurity news, explained simply`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  other: {
    'google-adsense-account': ADSENSE_CLIENT,
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Cybersecurity news, explained simply`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/icon.png', apple: '/icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/*
        Browser extensions such as Grammarly add attributes to <body> before
        React hydrates, which otherwise surfaces as a hydration mismatch that no
        application change can fix.
      */}
      <body
        suppressHydrationWarning
        className="bg-white text-[#111] antialiased dark:bg-[#121212] dark:text-white"
      >
        <AuthProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
          <AutoAds />
        </AuthProvider>

        {/*
          AdSense loader, as a plain async script rather than next/script.

          React hoists an async <script> to <head> and emits it literally in the
          server-rendered HTML, which is what the AdSense site review looks for.
          next/script could not do both: `beforeInteractive` had to sit inside
          <head>, where a component-rendered script never executes on the client
          and Next warns about it, while `afterInteractive` left nothing but a
          preload link in the static HTML until hydration ran.
        */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
