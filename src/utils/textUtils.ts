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
