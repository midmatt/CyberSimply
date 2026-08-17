import { getBreakingLabel } from '@/lib/breaking';

/**
 * Solid red pill matching the app's BreakingBadge. Shown next to the category
 * tag so a live incident is obvious in the feed and on the article page.
 */
export function BreakingBadge({ category }: { category?: string | null }) {
  const qualifier = getBreakingLabel(category);

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-[#E5484D] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white"
      aria-label={qualifier ? `Breaking news: ${qualifier}` : 'Breaking news'}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-current">
        <path d="M7 2v11h3v9l7-12h-4l4-8z" />
      </svg>
      {qualifier ? `Breaking · ${qualifier}` : 'Breaking'}
    </span>
  );
}
