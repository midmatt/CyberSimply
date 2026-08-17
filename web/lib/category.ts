/**
 * Ported from `src/utils/articleCategory.ts` so the web tags match the app's.
 *
 * The stored `category` column only has three coarse values, which is not
 * enough to colour-code a feed, so the headline and summary are scanned for
 * incident language first and the stored value is only a fallback.
 */

export type ArticleCategoryKind =
  | 'breach'
  | 'phishing'
  | 'patch'
  | 'advisory'
  | 'policy'
  | 'neutral';

export interface ArticleCategory {
  kind: ArticleCategoryKind;
  label: string;
}

interface CategoryMatcher extends ArticleCategory {
  pattern: RegExp;
}

/**
 * Order matters: first match wins. A story announcing a fix for a known flaw
 * reads as a patch, not an advisory, so `patch` is tested first. Incident
 * language outranks everything because a live breach is the most useful thing
 * to signal at a glance.
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

const FALLBACK_BY_SOURCE_CATEGORY: Record<string, ArticleCategory> = {
  hacking: { kind: 'breach', label: 'Breach' },
  cybersecurity: { kind: 'advisory', label: 'Advisory' },
  general: { kind: 'neutral', label: 'Security' },
};

export function getArticleCategory(article: {
  title: string;
  summary?: string | null;
  category?: string | null;
}): ArticleCategory {
  const haystack = `${article.title ?? ''} ${article.summary ?? ''}`;

  for (const matcher of MATCHERS) {
    if (matcher.pattern.test(haystack)) {
      return { kind: matcher.kind, label: matcher.label };
    }
  }

  return (
    FALLBACK_BY_SOURCE_CATEGORY[article.category ?? 'general'] ??
    FALLBACK_BY_SOURCE_CATEGORY.general
  );
}

/**
 * Light-mode tag colours from `src/constants/index.ts`, tuned for >=4.5:1 on a
 * white surface, paired with a tint for the pill background. The dark values
 * are the lifted variants used on the app's #1e1e1e cards.
 */
export const CATEGORY_STYLES: Record<
  ArticleCategoryKind,
  { text: string; darkText: string; tint: string; darkTint: string }
> = {
  breach: { text: '#C62A2F', darkText: '#FF6369', tint: '#FDECEC', darkTint: '#3A1B1D' },
  phishing: { text: '#B4341F', darkText: '#FF8A65', tint: '#FDEDE8', darkTint: '#3A211A' },
  advisory: { text: '#96590A', darkText: '#FFB224', tint: '#FBF1DF', darkTint: '#372A12' },
  patch: { text: '#2F4BA6', darkText: '#8DA4FF', tint: '#EAEEF9', darkTint: '#1D2340' },
  policy: { text: '#0B7268', darkText: '#2EC4B0', tint: '#E5F4F2', darkTint: '#12312E' },
  neutral: { text: '#5A5A5A', darkText: '#B0B0B0', tint: '#F0F0F0', darkTint: '#2A2A2A' },
};
