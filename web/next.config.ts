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
   * Static export, because cybersimply.com is served by GitHub Pages — the same
   * host the Expo Web build used. Article data is read from Supabase at build
   * time and the site is rebuilt after each article-fetch run, so the feed
   * stays current without needing a Node server.
   */
  output: 'export',

  /** GitHub Pages serves `/article/x/` as a directory, so emit index.html. */
  trailingSlash: true,

  images: {
    // No image optimizer exists in a static export.
    unoptimized: true,
  },
};

export default nextConfig;
