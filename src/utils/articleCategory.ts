import type { ProcessedArticle } from '../services/newsService';
import { getThemeColors } from '../constants';

export type ArticleCategoryKind =
  | 'breach'
  | 'phishing'
  | 'patch'
  | 'advisory'
  | 'policy'
  | 'neutral';

type ThemeColors = ReturnType<typeof getThemeColors>;

interface CategoryMatcher {
  kind: ArticleCategoryKind;
  label: string;
  pattern: RegExp;
}

/**
 * Order matters: the first match wins. A story that announces a fix for a
 * known flaw reads as a patch, not an advisory, so `patch` is tested before
 * `advisory`. Incident language outranks everything because a live breach is
 * the most useful thing to signal at a glance.
 */
const MATCHERS: CategoryMatcher[] = [
  {
    kind: 'breach',
    label: 'Breach',
    pattern:
      /\b(breach(?:es|ed)?|data leak|leaked|exfiltrat\w*|exposed records|stolen|ransomware|hacked|compromis(?:e|ed|ing)|extortion|held to ransom)\b/i,
  },
  {
    kind: 'phishing',
    label: 'Phishing',
    pattern:
      /\b(phish\w*|smishing|vishing|scam\w*|social engineering|impersonat\w*|spoof\w*|fraud\w*|fake (?:site|email|login))\b/i,
  },
  {
    kind: 'patch',
    label: 'Patch',
    pattern:
      /\b(patch(?:es|ed|ing)?|hotfix|security updates?|patch tuesday|fixes? (?:a |the )?(?:flaw|bug|vulnerabilit\w*))\b/i,
  },
  {
    kind: 'advisory',
    label: 'Advisory',
    pattern:
      /\b(vulnerabilit\w*|cve-\d{4}|zero[- ]day|0-day|exploit\w*|flaws?|advisory|advisories|proof[- ]of[- ]concept|rce)\b/i,
  },
  {
    kind: 'policy',
    label: 'Policy',
    pattern:
      /\b(polic(?:y|ies)|regulat\w*|complian\w*|gdpr|hipaa|ccpa|lawsuit|fined?|fines|penalt\w*|legislation|bill|sanction\w*|ftc|watchdog)\b/i,
  },
];

const FALLBACK_BY_SOURCE_CATEGORY: Record<
  ProcessedArticle['category'],
  { kind: ArticleCategoryKind; label: string }
> = {
  hacking: { kind: 'breach', label: 'Breach' },
  cybersecurity: { kind: 'advisory', label: 'Advisory' },
  general: { kind: 'neutral', label: 'Security' },
};

export interface ArticleCategory {
  kind: ArticleCategoryKind;
  label: string;
}

/**
 * Derives a display tag from the article text. The stored `category` field only
 * has three coarse values, which is not enough to colour-code the feed, so the
 * headline and summary are scanned for incident language first and the stored
 * category is used only as a fallback.
 */
export function getArticleCategory(article: ProcessedArticle): ArticleCategory {
  const haystack = `${article.title ?? ''} ${article.summary ?? ''}`;

  for (const matcher of MATCHERS) {
    if (matcher.pattern.test(haystack)) {
      return { kind: matcher.kind, label: matcher.label };
    }
  }

  return FALLBACK_BY_SOURCE_CATEGORY[article.category] ?? FALLBACK_BY_SOURCE_CATEGORY.general;
}

export interface ArticleCategoryMeta {
  kind: ArticleCategoryKind;
  /** Matches the tag text rendered by CategoryTag in the feed. */
  label: string;
  /** Longer form for the Categories screen. */
  name: string;
  description: string;
  icon: string;
}

/**
 * Browsable categories, in the order the Categories screen lists them.
 * `neutral` sits last because it is the fallback bucket.
 */
export const ARTICLE_CATEGORIES: ArticleCategoryMeta[] = [
  {
    kind: 'breach',
    label: 'Breach',
    name: 'Breaches & Incidents',
    description: 'Data breaches, leaks, and ransomware',
    icon: 'alert-circle',
  },
  {
    kind: 'phishing',
    label: 'Phishing',
    name: 'Phishing & Scams',
    description: 'Scams, impersonation, and social engineering',
    icon: 'mail-unread',
  },
  {
    kind: 'advisory',
    label: 'Advisory',
    name: 'Vulnerabilities',
    description: 'Flaws, exploits, and security advisories',
    icon: 'bug',
  },
  {
    kind: 'patch',
    label: 'Patch',
    name: 'Patches & Updates',
    description: 'Fixes and security updates to install',
    icon: 'construct',
  },
  {
    kind: 'policy',
    label: 'Policy',
    name: 'Policy & Regulation',
    description: 'Rules, compliance, fines, and enforcement',
    icon: 'document-text',
  },
  {
    kind: 'neutral',
    label: 'Security',
    name: 'General Security',
    description: 'Other security and technology news',
    icon: 'newspaper',
  },
];

const CATEGORY_BY_KIND = ARTICLE_CATEGORIES.reduce(
  (acc, meta) => {
    acc[meta.kind] = meta;
    return acc;
  },
  {} as Record<ArticleCategoryKind, ArticleCategoryMeta>,
);

/** Icon shown wherever a category stands in for missing artwork. */
export function getCategoryIcon(kind: ArticleCategoryKind): string {
  return CATEGORY_BY_KIND[kind].icon;
}

export type ArticleCategoryCounts = Record<ArticleCategoryKind, number>;

/**
 * Single pass over the article list. The Categories screen calls this once per
 * load instead of re-deriving a category for every article inside every card.
 */
export function countArticleCategories(articles: ProcessedArticle[]): ArticleCategoryCounts {
  const counts = {
    breach: 0,
    phishing: 0,
    patch: 0,
    advisory: 0,
    policy: 0,
    neutral: 0,
  } as ArticleCategoryCounts;

  for (const article of articles) {
    counts[getArticleCategory(article).kind] += 1;
  }

  return counts;
}

export function getCategoryColor(kind: ArticleCategoryKind, colors: ThemeColors): string {
  switch (kind) {
    case 'breach':
      return colors.categoryBreach;
    case 'phishing':
      return colors.categoryPhishing;
    case 'patch':
      return colors.categoryPatch;
    case 'advisory':
      return colors.categoryAdvisory;
    case 'policy':
      return colors.categoryPolicy;
    default:
      return colors.categoryNeutral;
  }
}

/**
 * True when the article carries an AI-written explainer, which is what the
 * sparkle icon in the feed indicates.
 */
export function hasAiSummary(article: ProcessedArticle): boolean {
  const what = article.what?.trim();
  return Boolean(what) && what!.toUpperCase() !== 'N/A';
}
