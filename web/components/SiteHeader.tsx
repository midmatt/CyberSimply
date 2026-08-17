import Link from 'next/link';
import { AccountButton } from './AccountButton';
import { SITE_NAME } from '@/lib/config';

/**
 * The interlocking CS mark, swapped by colour scheme: the light asset has a
 * black S for white backgrounds, the dark asset a light grey S. Both are the
 * same files the app ships, copied into public/.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/85 backdrop-blur-md dark:border-white/10 dark:bg-[#121212]/85">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${SITE_NAME} home`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, no optimizer */}
          <img
            src="/cs-logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 object-contain dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, no optimizer */}
          <img
            src="/cs-logo-dark.png"
            alt=""
            width={32}
            height={32}
            className="hidden h-8 w-8 shrink-0 object-contain dark:block"
          />
          <span className="text-[19px] font-bold tracking-[-0.02em]">{SITE_NAME}</span>
        </Link>

        <div className="flex items-center gap-2">
          <a
            href="https://apps.apple.com/app/cybersimply/id6752827918"
            className="hidden rounded-full border border-black/10 px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:border-[#ff7613] hover:text-[#ff7613] sm:inline-block dark:border-white/15"
          >
            Get the app
          </a>
          <AccountButton />
        </div>
      </div>
    </header>
  );
}
