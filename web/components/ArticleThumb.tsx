'use client';

import { useState } from 'react';
import { CATEGORY_STYLES, type ArticleCategoryKind } from '@/lib/category';

interface ArticleThumbProps {
  src: string | null;
  alt: string;
  categoryKind: ArticleCategoryKind;
  /** Aspect ratio utility, e.g. `aspect-[16/9]`. */
  className?: string;
}

/**
 * Article artwork with a category-tinted fallback, mirroring the app's
 * ArticleImage. A plain `<img>` is used rather than `next/image` because the
 * site is a static export and the artwork comes from dozens of unpredictable
 * publisher domains, which would each need a `remotePatterns` entry.
 *
 * The wrapper owns the aspect ratio and clips, so `object-cover` can fill it
 * without distorting or cropping unpredictably.
 */
export function ArticleThumb({ src, alt, categoryKind, className = '' }: ArticleThumbProps) {
  const [failed, setFailed] = useState(false);
  const style = CATEGORY_STYLES[categoryKind];
  const showFallback = !src || failed;

  return (
    <div
      className={`relative w-full shrink-0 overflow-hidden bg-neutral-100 dark:bg-neutral-800 ${className}`}
    >
      {showFallback ? (
        <div
          className="flex h-full w-full items-center justify-center bg-[var(--tint)] dark:bg-[var(--tint-dark)]"
          style={
            {
              '--tint': style.tint,
              '--tint-dark': style.darkTint,
            } as React.CSSProperties
          }
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-8 w-8 text-[var(--mark)] dark:text-[var(--mark-dark)]"
            style={
              {
                '--mark': style.text,
                '--mark-dark': style.darkText,
              } as React.CSSProperties
            }
            fill="currentColor"
          >
            <path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4zm0 6a1.5 1.5 0 011.5 1.5v4a1.5 1.5 0 01-3 0v-4A1.5 1.5 0 0112 7zm0 10.5a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" />
          </svg>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- static export, unbounded publisher domains
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      )}
    </div>
  );
}
