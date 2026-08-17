import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/**
 * Browser-side client, separate from the build-time one in `articles.ts`.
 *
 * This one persists the session so a visitor stays signed in across page loads,
 * and reads the tokens Supabase appends to the URL after an email confirmation
 * or password reset — the site is a static export, so there is no server route
 * to exchange them.
 */
export const supabaseBrowser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Subset of `user_profiles` the site cares about. */
export interface WebProfile {
  id: string;
  display_name: string | null;
  ad_free: boolean | null;
  is_premium: boolean | null;
  premium_expires_at: string | null;
}
