/**
 * Date utility functions for proper date handling and formatting
 */

export interface DateFormatOptions {
  showTime?: boolean;
  showYear?: boolean;
  relative?: boolean;
  short?: boolean;
}

/**
 * Parse a date string and ensure it's valid
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return null;
  }
}

/**
 * Check if an article should be archived (older than specified days)
 */
export function shouldArchiveArticle(articleDate: string, daysOld: number = 7): boolean {
  const date = parseDate(articleDate);
  if (!date) return false;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return date < cutoffDate;
}

/**
 * Get articles that should be archived
 */
export function getArticlesToArchive<T extends { publishedAt: string }>(
  articles: T[], 
  daysOld: number = 7
): T[] {
  return articles.filter(article => shouldArchiveArticle(article.publishedAt, daysOld));
}

/**
 * Get articles that should remain in main feed (not archived)
 */
export function getRecentArticles<T extends { publishedAt: string }>(
  articles: T[], 
  daysOld: number = 7
): T[] {
  return articles.filter(article => !shouldArchiveArticle(article.publishedAt, daysOld));
}

/**
 * Format a date for display with various options
 */
export function formatArticleDate(
  dateString: string, 
  options: DateFormatOptions = {}
): string {
  const date = parseDate(dateString);
  if (!date) return 'Date unknown';
  
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  // If relative is requested and date is recent
  if (options.relative && diffInDays < 7) {
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
  }
  
  // Format based on options
  const formatOptions: Intl.DateTimeFormatOptions = {};
  
  if (options.short) {
    formatOptions.month = 'short';
    formatOptions.day = 'numeric';
  } else {
    formatOptions.month = 'long';
    formatOptions.day = 'numeric';
  }
  
  if (options.showYear || date.getFullYear() !== now.getFullYear()) {
    formatOptions.year = 'numeric';
  }
  
  if (options.showTime) {
    formatOptions.hour = 'numeric';
    formatOptions.minute = '2-digit';
    formatOptions.hour12 = true;
  }
  
  return date.toLocaleDateString('en-US', formatOptions);
}

/**
 * Get a realistic date for AI-generated articles
 * This ensures AI articles have proper dates that make sense
 */
export function getRealisticAIDate(): string {
  const now = new Date();
  
  // AI articles should be from the last 3 days to appear current
  const randomHoursAgo = Math.floor(Math.random() * 72); // 0-72 hours ago
  const aiDate = new Date(now.getTime() - (randomHoursAgo * 60 * 60 * 1000));
  
  return aiDate.toISOString();
}

/**
 * Check if a date is from today
 */
export function isToday(dateString: string): boolean {
  const date = parseDate(dateString);
  if (!date) return false;
  
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Check if a date is from yesterday
 */
export function isYesterday(dateString: string): boolean {
  const date = parseDate(dateString);
  if (!date) return false;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return date.toDateString() === yesterday.toDateString();
}

/**
 * Get the age of an article in days
 */
export function getArticleAge(dateString: string): number {
  const date = parseDate(dateString);
  if (!date) return Infinity;
  
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
}

/**
 * Sort articles by date (newest first)
 */
export function sortArticlesByDate<T extends { publishedAt: string }>(
  articles: T[]
): T[] {
  return articles.sort((a, b) => {
    const dateA = parseDate(a.publishedAt);
    const dateB = parseDate(b.publishedAt);
    
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    return dateB.getTime() - dateA.getTime(); // Newest first
  });
}

/**
 * Get date range for filtering articles
 */
export function getDateRange(days: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  
  return { start, end };
}

/**
 * Check if an article is within a date range
 */
export function isWithinDateRange(
  articleDate: string, 
  startDate: Date, 
  endDate: Date
): boolean {
  const date = parseDate(articleDate);
  if (!date) return false;
  
  return date >= startDate && date <= endDate;
}

/**
 * Get a human-readable time ago string
 */
export function getTimeAgo(dateString: string): string {
  const date = parseDate(dateString);
  if (!date) return 'Unknown time';
  
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}mo ago`;
  
  return `${Math.floor(diffInDays / 365)}y ago`;
}
