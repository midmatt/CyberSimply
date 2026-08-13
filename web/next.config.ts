import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * The Expo app at the repo root has its own lockfile, so Turbopack has to be
   * told this directory is the web app's root rather than inferring it.
   */
  turbopack: {
    root: path.resolve(__dirname),
  },

  /**
   * cybersimply.com is served by Vercel. Pages are incrementally regenerated
   * (see `revalidate` in app/) rather than exported statically, so the feed
   * picks up new Supabase rows on its own instead of needing the article-fetch
   * workflow to trigger a rebuild.
   */
  trailingSlash: true,
};

export default nextConfig;
