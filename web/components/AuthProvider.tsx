'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabaseBrowser, type WebProfile } from '@/lib/supabaseBrowser';

interface AuthResult {
  success: boolean;
  error?: string;
  /** Set when sign-up needs the emailed confirmation link before signing in. */
  needsConfirmation?: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: WebProfile | null;
  /** False until the stored session has been read, so the header can wait. */
  ready: boolean;
  /** True for paying accounts — suppresses every ad slot. */
  isAdFree: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Premium counts only while it has not lapsed, matching AdFreeContext in the app. */
function computeAdFree(profile: WebProfile | null): boolean {
  if (!profile) return false;
  if (profile.ad_free) return true;
  if (!profile.is_premium) return false;

  const expires = profile.premium_expires_at;
  return !expires || new Date(expires).getTime() > Date.now();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<WebProfile | null>(null);
  const [ready, setReady] = useState(false);

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabaseBrowser
      .from('user_profiles')
      .select('id, display_name, ad_free, is_premium, premium_expires_at')
      .eq('id', nextUser.id)
      .maybeSingle();

    // A missing row is normal for an account that has never opened the app;
    // it just means no ad-free entitlement, so the visitor still sees ads.
    setProfile(error ? null : (data as WebProfile | null));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const applySession = async (session: Session | null) => {
      if (cancelled) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      await loadProfile(nextUser);
      if (!cancelled) setReady(true);
    };

    supabaseBrowser.auth.getSession().then(({ data }) => applySession(data.session));

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    return error ? { success: false, error: error.message } : { success: true };
  }, []);

  const signUp = useCallback<AuthContextValue['signUp']>(async (email, password) => {
    const { data, error } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) return { success: false, error: error.message };

    // Supabase returns a user without a session when confirmations are on.
    return { success: true, needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabaseBrowser.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const resetPassword = useCallback<AuthContextValue['resetPassword']>(async (email) => {
    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return error ? { success: false, error: error.message } : { success: true };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      ready,
      isAdFree: computeAdFree(profile),
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [user, profile, ready, signIn, signUp, signOut, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
