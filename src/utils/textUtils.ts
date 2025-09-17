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
