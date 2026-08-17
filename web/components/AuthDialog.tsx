'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';

type Mode = 'signin' | 'signup' | 'reset';

const COPY: Record<Mode, { title: string; blurb: string; submit: string }> = {
  signin: {
    title: 'Sign in',
    blurb: 'Use the same email and password as the CyberSimply app.',
    submit: 'Sign in',
  },
  signup: {
    title: 'Create an account',
    blurb: 'One account works across the website and the app.',
    submit: 'Create account',
  },
  reset: {
    title: 'Reset password',
    blurb: 'We’ll email you a link to choose a new password.',
    submit: 'Send reset link',
  },
};

export function AuthDialog({ onClose }: { onClose: () => void }) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === 'reset') {
        const result = await resetPassword(email);
        if (!result.success) return setError(result.error ?? 'Could not send the reset link.');
        return setNotice('Check your email for the reset link.');
      }

      const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);

      if (!result.success) return setError(result.error ?? 'Something went wrong.');

      if (result.needsConfirmation) {
        return setNotice('Account created. Confirm your email, then sign in.');
      }

      onClose();
    } finally {
      setBusy(false);
    }
  }

  const copy = COPY[mode];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e1e]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-dialog-title" className="text-xl font-bold tracking-[-0.02em]">
              {copy.title}
            </h2>
            <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">{copy.blurb}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-black/5 hover:text-neutral-600 dark:hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium">Email</span>
            <input
              ref={emailRef}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-[15px] outline-none transition-colors focus:border-[#ff7613] dark:border-white/15 dark:bg-[#121212]"
            />
          </label>

          {mode !== 'reset' && (
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium">Password</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-[15px] outline-none transition-colors focus:border-[#ff7613] dark:border-white/15 dark:bg-[#121212]"
              />
            </label>
          )}

          {error && (
            <p role="alert" className="text-[13px] font-medium text-[#C62A2F] dark:text-[#FF6369]">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-[13px] font-medium text-[#0B7268] dark:text-[#2EC4B0]">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#ff7613] py-2.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Working…' : copy.submit}
          </button>
        </form>

        <div className="mt-4 space-y-1.5 text-[13px] text-neutral-500 dark:text-neutral-400">
          {mode === 'signin' && (
            <>
              <p>
                No account?{' '}
                <button type="button" onClick={() => switchMode('signup')} className="font-semibold text-[#ff7613]">
                  Create one
                </button>
              </p>
              <p>
                <button type="button" onClick={() => switchMode('reset')} className="font-semibold text-[#ff7613]">
                  Forgot your password?
                </button>
              </p>
            </>
          )}
          {mode !== 'signin' && (
            <p>
              <button type="button" onClick={() => switchMode('signin')} className="font-semibold text-[#ff7613]">
                Back to sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
