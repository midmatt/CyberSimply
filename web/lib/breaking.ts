/**
 * Breaking-news display rules. Ported from `src/utils/breakingNews.ts` so the
 * site pins and labels the same stories the app does.
 */

export const BREAKING_PIN_DURATION_HOURS = 6;

export type BreakingCategoryKind = 'breach' | 'outage' | 'active_attack' | 'critical_vuln';

export interface BreakingFields {
  is_breaking?: boolean | null;
  breaking_category?: string | null;
  breaking_tagged_at?: string | null;
}

const LABELS: Record<BreakingCategoryKind, string> = {
  breach: 'Breach',
  outage: 'Outage',
  active_attack: 'Under attack',
  critical_vuln: 'Exploited',
};

export function getBreakingLabel(category: string | null | undefined): string | null {
  if (!category) return null;
  return LABELS[category as BreakingCategoryKind] ?? null;
}

export function isPinnedBreaking(article: BreakingFields, now: number = Date.now()): boolean {
  if (!article.is_breaking || !article.breaking_tagged_at) return false;

  const taggedAt = new Date(article.breaking_tagged_at).getTime();
  if (Number.isNaN(taggedAt)) return false;

  return (now - taggedAt) / 3_600_000 < BREAKING_PIN_DURATION_HOURS;
}

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
    const aTime = new Date(a.breaking_tagged_at ?? 0).getTime();
    const bTime = new Date(b.breaking_tagged_at ?? 0).getTime();
    return bTime - aTime;
  });

  return [...pinned, ...rest];
}
