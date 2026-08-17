/**
 * Breaking-news display rules.
 *
 * The detection pipeline (breaking-news-check.mjs) sets `is_breaking`,
 * `breaking_category` and `breaking_tagged_at` on the article row. This module
 * owns what the app does with them, so the pin window lives in one place.
 */

/**
 * How long a breaking story outranks newer articles. Six hours is long enough
 * to cover a working day's worth of scrolling without letting yesterday's
 * incident sit above this morning's news.
 */
export const BREAKING_PIN_DURATION_HOURS = 6;

export type BreakingCategoryKind = 'breach' | 'outage' | 'active_attack' | 'critical_vuln';

export interface BreakingFields {
  isBreaking?: boolean;
  breakingCategory?: string | null;
  breakingTaggedAt?: string | null;
}

const LABELS: Record<BreakingCategoryKind, string> = {
  breach: 'Breach',
  outage: 'Outage',
  active_attack: 'Under attack',
  critical_vuln: 'Exploited',
};

/** Short qualifier shown next to the BREAKING badge, when the kind is known. */
export function getBreakingLabel(category: string | null | undefined): string | null {
  if (!category) return null;
  return LABELS[category as BreakingCategoryKind] ?? null;
}

/**
 * True while the story should still be pinned. A tagged article whose window
 * has lapsed keeps its badge — it really was breaking — but stops jumping the
 * queue, so the feed returns to chronological order on its own.
 */
export function isPinnedBreaking(article: BreakingFields, now: number = Date.now()): boolean {
  if (!article.isBreaking || !article.breakingTaggedAt) return false;

  const taggedAt = new Date(article.breakingTaggedAt).getTime();
  if (Number.isNaN(taggedAt)) return false;

  return (now - taggedAt) / 3_600_000 < BREAKING_PIN_DURATION_HOURS;
}

/**
 * Moves currently-pinned breaking stories to the front, newest incident first,
 * and leaves everything else in the order it arrived (already newest-first from
 * the query). Returns a new array; the input is not mutated.
 */
export function sortWithBreakingPinned<T extends BreakingFields>(
  articles: T[],
  now: number = Date.now(),
): T[] {
  const pinned: T[] = [];
  const rest: T[] = [];

  for (const article of articles) {
    (isPinnedBreaking(article, now) ? pinned : rest).push(article);
  }

  if (pinned.length === 0) return articles;

  pinned.sort((a, b) => {
    const aTime = new Date(a.breakingTaggedAt ?? 0).getTime();
    const bTime = new Date(b.breakingTaggedAt ?? 0).getTime();
    return bTime - aTime;
  });

  return [...pinned, ...rest];
}
