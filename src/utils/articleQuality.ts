/**
 * Guards against non-articles reaching the feed.
 *
 * The upstream providers mix genuine reporting with PyPI release notifications
 * ("vulnclaw 0.3.8"), vendor forum posts ("Hello everyone,"), and rows whose
 * title was derived from a URL slug ("begun development", stored verbatim from
 * thearabianpost.com/begun-development/). These are not truncation bugs — the
 * text really is that short in the database — so they have to be filtered out
 * rather than rendered.
 *
 * Measured against the 1,000 most recent stored articles, this rejects ~1.9%,
 * and every rejected row was hand-checked to be a non-article.
 */

/** `some-package 1.2.3` — a release notification, not a headline. */
const PACKAGE_RELEASE_RE = /^[a-z0-9][a-z0-9._-]*\s+v?\d+\.\d+(\.\d+)?(\.[a-z0-9]+)?$/;

const MIN_WORDS = 3;
const MIN_CHARS = 30;

export function isDisplayableHeadline(title: string | null | undefined): boolean {
  const trimmed = (title ?? '').trim();

  if (!trimmed) {
    return false;
  }

  if (PACKAGE_RELEASE_RE.test(trimmed)) {
    return false;
  }

  // Forum greetings and slug-derived fragments trail a comma.
  if (trimmed.endsWith(',')) {
    return false;
  }

  // A colon signals a deliberately terse but real headline ("Review: CTRL+ALT+PWN").
  if (trimmed.includes(':')) {
    return true;
  }

  // CJK headlines carry few spaces, so length rescues them from the word count.
  if (trimmed.split(/\s+/).length < MIN_WORDS && trimmed.length < MIN_CHARS) {
    return false;
  }

  return true;
}

export function filterDisplayableArticles<T extends { title: string }>(articles: T[]): T[] {
  return articles.filter(article => isDisplayableHeadline(article.title));
}
