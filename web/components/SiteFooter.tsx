import { SITE_NAME } from '@/lib/config';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-black/[0.06] py-10 dark:border-white/10">
      <div className="mx-auto max-w-6xl px-4 text-[13px] text-neutral-500 sm:px-6 dark:text-neutral-400">
        <p>
          © {new Date().getFullYear()} {SITE_NAME}. Cybersecurity news, explained simply.
        </p>
        <p className="mt-1.5">
          Headlines and summaries are sourced from third-party news providers and link back to the
          original publisher.
        </p>
      </div>
    </footer>
  );
}
