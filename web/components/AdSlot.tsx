'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ADSENSE_CLIENT } from '@/lib/config';
import { useAuth } from './AuthProvider';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSlotProps {
  /** AdSense ad unit id. Auto ads still run site-wide without this. */
  slot?: string;
  label?: string;
  className?: string;
}

/** How long to wait for AdSense to report a fill before collapsing the slot. */
const FILL_TIMEOUT_MS = 4000;

/**
 * True only after hydration. `useSyncExternalStore` is the supported way to ask
 * this — a `useState` + `useEffect` pair sets state during an effect, which
 * triggers the cascading-render lint rule.
 */
const noopSubscribe = () => () => {};

function useHasMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * A single AdSense placement.
 *
 * The <ins> is mounted on the client rather than server-rendered. AdSense
 * replaces that element in place, adding attributes and an iframe child, and it
 * can win the race against hydration — React then sees DOM it did not render
 * and discards the tree. `suppressHydrationWarning` is not enough here because
 * it does not cover injected children. Google's crawler executes JavaScript, so
 * the unit is still discoverable once mounted.
 *
 * The slot collapses when nothing is served, which is the normal state until
 * the site is approved in AdSense; otherwise every placement would leave a tall
 * empty gap in the middle of the feed.
 */
export function AdSlot({ slot, label = 'Advertisement', className = '' }: AdSlotProps) {
  const { ready, isAdFree } = useAuth();
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const mounted = useHasMounted();
  const [filled, setFilled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!slot || !mounted || !ready || isAdFree || pushed.current) return;

    const element = insRef.current;
    if (!element) return;

    pushed.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense is blocked, offline, or not yet approved. The timeout below
      // collapses the slot, so nothing needs to be recorded here.
    }

    // AdSense reports the outcome by setting data-ad-status on the element.
    const observer = new MutationObserver(() => {
      const status = element.getAttribute('data-ad-status');
      if (status === 'filled') setFilled(true);
      else if (status === 'unfilled') setFilled(false);
    });
    observer.observe(element, { attributes: true, attributeFilter: ['data-ad-status'] });

    // Nothing sets the status when the script never loads at all, so settle it.
    const timer = window.setTimeout(() => {
      setFilled(element.getAttribute('data-ad-status') === 'filled');
    }, FILL_TIMEOUT_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [mounted, ready, isAdFree]);

  if ((ready && isAdFree) || filled === false) return null;
  if (!slot) return null;

  return (
    <div
      className={`flex flex-col overflow-hidden ${
        filled
          ? 'min-h-[260px] rounded-2xl border border-black/[0.06] bg-neutral-50 p-3 dark:border-white/10 dark:bg-white/[0.03]'
          : 'min-h-[120px]'
      } ${className}`}
    >
      {filled && (
        <span className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          {label}
        </span>
      )}
      {mounted && (
        <ins
          ref={insRef}
          className="adsbygoogle block w-full grow"
          style={{ display: 'block', minHeight: 100 }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format="fluid"
          data-ad-layout-key="-6t+ed+2i-1n-4w"
          data-full-width-responsive="true"
        />
      )}
    </div>
  );
}
