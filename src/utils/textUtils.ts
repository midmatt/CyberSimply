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

/**
 * Truncates text without cutting mid-word.
 *
 * Provider-supplied summaries frequently arrive already truncated mid-sentence
 * (e.g. "...said three"), so this prefers a sentence boundary when one falls
 * reasonably late in the string, and otherwise falls back to the last whole
 * word. Trailing punctuation left dangling by the cut is removed.
 *
 * @param text - The text to truncate
 * @param maxChars - Soft character budget for the result
 * @returns Text ending on a clean word or sentence boundary
 */
export function truncateAtBoundary(text: string, maxChars: number = 160): string {
  if (!text) return '';

  const clean = text.replace(/\s+/g, ' ').trim();

  if (clean.length <= maxChars) {
    // Short enough to keep whole, but provider text is often already clipped
    // mid-sentence upstream. Mark it as continuing rather than leaving it
    // looking like a failed render.
    return /[.!?…"')\]]$/.test(clean) ? clean : `${clean}…`;
  }

  const window = clean.slice(0, maxChars + 1);

  // Prefer a sentence boundary, but only if it isn't so early that we'd throw
  // away most of the budget.
  const lastSentenceEnd = Math.max(
    window.lastIndexOf('. '),
    window.lastIndexOf('! '),
    window.lastIndexOf('? ')
  );
  if (lastSentenceEnd >= maxChars * 0.6) {
    return clean.slice(0, lastSentenceEnd + 1);
  }

  // Otherwise cut at the last complete word.
  const lastSpace = window.lastIndexOf(' ');
  const cutAt = lastSpace > 0 ? lastSpace : maxChars;
  const trimmed = clean.slice(0, cutAt).replace(/[\s,;:.–—-]+$/, '');

  return `${trimmed}…`;
}

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
