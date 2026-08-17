/**
 * Ported from `src/utils/textUtils.ts` so the web feed shows the same repaired
 * copy as the app. The `summary` column is stored verbatim from the news APIs,
 * so these artifacts have to be fixed on read.
 *
 * Truncation is deliberately absent: length is capped with CSS line clamping,
 * never by slicing the string, which is what cut headlines mid-word before.
 */

const SYNDICATION_FOOTER_RE =
  /\s*(?:the post|this post|this news|this article|the article|this story)\b[\s\S]*?\bappeared first on\b[\s\S]*$/i;

/** A list marker that kept its punctuation, e.g. "1. ", "2) ". */
const LIST_MARKER_RE = /^\s*\d{1,3}\s*[.):\]]\s+/;

/**
 * A bare leading number. Ambiguous alone ("5 million records were exposed"), so
 * it is only removed when the headline follows it — the shape left behind when
 * the marker's punctuation was stripped upstream.
 */
const BARE_LEADING_NUMBER_RE = /^\s*\d{1,3}\s+/;

function normalizeForCompare(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function cleanTruncatedText(text: string): string {
  if (!text) return '';

  let cleaned = text.replace(/\s+/g, ' ').trim();

  cleaned = cleaned.replace(/\s*\[(?:…|\.\.\.)\]\s*$/, '');
  cleaned = cleaned.replace(/(?:…|\.\.\.)\s*$/, '');
  cleaned = cleaned.trim();

  if (!cleaned) return '';

  if (/[.!?]["'”’)\]]?$/.test(cleaned)) return cleaned;

  const upToLastSentence = cleaned.match(/^[\s\S]*[.!?]["'”’)\]]?(?=\s)/);
  return upToLastSentence ? upToLastSentence[0].trim() : cleaned;
}

export function cleanSummaryText(summary: string | null | undefined, title?: string): string {
  if (!summary) return '';

  let text = summary.replace(/\s+/g, ' ').trim();

  text = text.replace(SYNDICATION_FOOTER_RE, '');
  text = text.replace(LIST_MARKER_RE, '');

  if (title) {
    const normalizedTitle = normalizeForCompare(title);
    const withoutNumber = text.replace(BARE_LEADING_NUMBER_RE, '');

    if (normalizedTitle && normalizeForCompare(withoutNumber).startsWith(normalizedTitle)) {
      text = withoutNumber.slice(normalizedTitle.length).replace(/^[\s\-–—:.,|]+/, '');
    }
  }

  // "Bengaluru -based" — a space before a hyphen with none after it is damage.
  text = text.replace(/([A-Za-z0-9])\s+-([A-Za-z0-9])/g, '$1-$2');
  // "STL.News ." — punctuation orphaned from its word.
  text = text.replace(/\s+([.,;:!?])/g, '$1');

  return cleanTruncatedText(text);
}

/**
 * The `takeaways` column stores a bulleted list flattened into one string
 * ("- first point. - second point"), which reads as a run-on paragraph unless
 * it is split back apart. Splitting only happens when the text opens with a
 * bullet marker, so prose containing a spaced dash is left alone.
 */
export function parseBullets(text: string): string[] | null {
  const trimmed = text.trim();

  if (!/^[-•*]\s+/.test(trimmed)) return null;

  const items = trimmed
    .split(/(?:^|\s)[-•*]\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 1 ? items : null;
}

/** Strips the domain down to something readable in a byline. */
export function formatSource(source: string | null | undefined): string {
  if (!source) return 'Unknown';
  return source
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}
