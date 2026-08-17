/**
 * Utility functions for text processing
 */

/**
 * Removes markdown-style ** formatting from text
 * @param text - The text to clean
 * @returns Cleaned text without ** formatting
 */
export function cleanMarkdownFormatting(text: string): string {
  if (!text) return text;
  
  // Remove ** formatting (markdown bold)
  return text.replace(/\*\*/g, '');
}

/*
 * NOTE: `truncateAtBoundary` was removed deliberately. Clipping display text to
 * a character budget cuts headlines at a width the layout has not actually
 * reached, and it appended an ellipsis to short strings that merely lacked
 * closing punctuation. Cap visible length with `numberOfLines` +
 * `ellipsizeMode="tail"` on the Text component instead, so the cut follows the
 * real measured width.
 */

/**
 * Removes upstream truncation artifacts from provider-supplied text.
 *
 * The news providers on their free tiers return a snippet rather than the
 * article body: NewsAPI clips descriptions at roughly 200 characters and
 * NewsData does the same, both leaving behind a "[...]" marker or a bare
 * ellipsis, often mid-sentence. Around 59% of stored summaries arrive this way,
 * so the text cannot be fixed by re-fetching — it has to be repaired on read.
 *
 * Drops the marker and then rewinds to the last complete sentence, so the text
 * ends somewhere deliberate. When no sentence boundary exists the text is
 * returned marker-free rather than emptied, which is why this never blanks a
 * summary that had content.
 *
 * @param text - Provider-supplied text that may be truncated
 * @returns Text ending on a complete sentence, with no truncation marker
 */
export function cleanTruncatedText(text: string): string {
  if (!text) return '';

  let cleaned = text.replace(/\s+/g, ' ').trim();

  // "[...]" / "[…]" and a bare trailing ellipsis are the two markers the
  // providers use to signal a clipped snippet.
  cleaned = cleaned.replace(/\s*\[(?:…|\.\.\.)\]\s*$/, '');
  cleaned = cleaned.replace(/(?:…|\.\.\.)\s*$/, '');
  cleaned = cleaned.trim();

  if (!cleaned) return '';

  // Already lands on a sentence end (optionally inside a closing quote/bracket).
  if (/[.!?]["'”’)\]]?$/.test(cleaned)) return cleaned;

  // Otherwise rewind to the last sentence end that is followed by a space, so a
  // decimal like "16.9%" or an abbreviation mid-sentence is not mistaken for one.
  const upToLastSentence = cleaned.match(/^[\s\S]*[.!?]["'”’)\]]?(?=\s)/);
  return upToLastSentence ? upToLastSentence[0].trim() : cleaned;
}

/**
 * Trailing syndication boilerplate. Aggregators paste the feed's footer into
 * the description, so the snippet ends with the headline a second time plus the
 * publication name, e.g. "This News <title> appeared first on STL.News".
 */
const SYNDICATION_FOOTER_RE =
  /\s*(?:the post|this post|this news|this article|the article|this story)\b[\s\S]*?\bappeared first on\b[\s\S]*$/i;

/** A list marker that kept its punctuation, e.g. "1. ", "2) ". */
const LIST_MARKER_RE = /^\s*\d{1,3}\s*[.):\]]\s+/;

/**
 * A bare leading number. Ambiguous on its own ("5 million records were
 * exposed"), so it is only removed when the headline follows it, which is the
 * shape left behind when the marker's punctuation was stripped upstream.
 */
const BARE_LEADING_NUMBER_RE = /^\s*\d{1,3}\s+/;

/** Case and curly-quote differences must not defeat the headline comparison. */
function normalizeForCompare(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Repairs the artifacts that arrive baked into provider `description` fields.
 *
 * The summary column is stored verbatim from the news APIs and never rewritten
 * by the AI step, so these have to be repaired on read: a leaked list-item
 * number, the headline repeated ahead of the real body, a space orphaned before
 * a hyphen or a full stop by the feed's HTML-to-text conversion, and the
 * syndication footer. Removing the footer also re-exposes the "[...]" marker
 * that was sitting mid-string, which is why the truncation cleanup runs last.
 *
 * @param summary - Provider-supplied summary text
 * @param title - Article headline, used to detect a verbatim repeat
 * @returns Display-ready summary, or '' when nothing but the headline remained
 */
export function cleanSummaryText(summary: string | null | undefined, title?: string): string {
  if (!summary) return '';

  let text = summary.replace(/\s+/g, ' ').trim();

  text = text.replace(SYNDICATION_FOOTER_RE, '');

  // An explicit marker is unambiguous, so it goes regardless of what follows.
  text = text.replace(LIST_MARKER_RE, '');

  if (title) {
    const normalizedTitle = normalizeForCompare(title);
    const withoutNumber = text.replace(BARE_LEADING_NUMBER_RE, '');

    // Whitespace is already collapsed and the remaining mappings preserve
    // length, so the normalized title's length indexes into the raw text.
    if (normalizedTitle && normalizeForCompare(withoutNumber).startsWith(normalizedTitle)) {
      text = withoutNumber.slice(normalizedTitle.length).replace(/^[\s\-–—:.,|]+/, '');
    }
  }

  // "Bengaluru -based" — a space before a hyphen that has none after it is
  // always damage; a spaced dash used as punctuation has spaces on both sides.
  text = text.replace(/([A-Za-z0-9])\s+-([A-Za-z0-9])/g, '$1-$2');

  // "STL.News ." — punctuation orphaned from the word it belongs to.
  text = text.replace(/\s+([.,;:!?])/g, '$1');

  return cleanTruncatedText(text);
}

/**
 * Formats text content for display by cleaning markdown and ensuring proper spacing
 * @param text - The text to format
 * @returns Formatted text ready for display
 */
export function formatTextForDisplay(text: string): string {
  if (!text) return text;
  
  // Clean markdown formatting
  let cleaned = cleanMarkdownFormatting(text);
  
  // Ensure proper paragraph spacing
  cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
  
  // Remove extra whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}
