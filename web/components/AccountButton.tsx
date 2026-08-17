'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { AuthDialog } from './AuthDialog';

export function AccountButton() {
  const { user, profile, ready, isAdFree, signOut } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menuOpen]);

  // Render the signed-out button during SSR and until the stored session is
  // read, so the markup the server sent matches what hydrates.
  if (!ready || !user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-full border border-black/10 px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:border-[#ff7613] hover:text-[#ff7613] dark:border-white/15"
        >
          Sign in
        </button>
        {dialogOpen && <AuthDialog onClose={() => setDialogOpen(false)} />}
      </>
    );
  }

  const label = profile?.display_name?.trim() || user.email || 'Account';
  const initial = label.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="flex items-center gap-2 rounded-full border border-black/10 py-1 pl-1 pr-3 text-[13px] font-medium transition-colors hover:border-[#ff7613] dark:border-white/15"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ff7613] text-[12px] font-bold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[140px] truncate sm:inline">{label}</span>
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-[#1e1e1e]"
        >
          <div className="border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
            <p className="truncate text-[14px] font-semibold">{label}</p>
            <p className="mt-0.5 text-[12px] text-neutral-500 dark:text-neutral-400">
              {isAdFree ? 'Ad-free is active' : 'Free account'}
            </p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              void signOut();
            }}
            className="w-full px-4 py-3 text-left text-[14px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
