import { createClient } from '@supabase/supabase-js';
import { FEED_LIMIT, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import { fillMissingImages } from './image';
import { sortWithBreakingPinned } from './breaking';
import { filterDisplayableArticles } from './quality';
import { cleanSummaryText } from './text';
import type { Article, ArticleRow } from './types';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

/** The same completeness bar the app applies before rendering a row. */
function isComplete(row: ArticleRow): boolean {
  return Boolean(row.id && row.title && row.summary && row.source && row.published_at);
}

function toArticle(row: ArticleRow): Article {
  const what = row.what?.trim();

  return {
    ...row,
    cleanSummary: cleanSummaryText(row.summary, row.title),
    hasAiSummary: Boolean(what) && what!.toUpperCase() !== 'N/A',
  };
}

/**
 * Recent articles for the feed, newest first — the same query the mobile app
 * runs (`articles` ordered by `published_at` desc), with the junk-headline
 * filter applied so package releases and slug fragments never reach a card.
 */
export async function getFeedArticles(limit: number = FEED_LIMIT): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    // Over-fetch so the quality filter cannot leave the feed short.
    .order('published_at', { ascending: false })
    .limit(limit * 2);

  if (error) {
    throw new Error(`Failed to load articles from Supabase: ${error.message}`);
  }

  const rows = (data ?? []) as ArticleRow[];

  const articles = filterDisplayableArticles(rows.filter(isComplete))
    .slice(0, limit)
    .map(toArticle);

  return sortWithBreakingPinned(await fillMissingImages(articles));
}

export async function getArticleById(id: string): Promise<Article | null> {
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();

  if (error) {
    throw new Error(`Failed to load article ${id}: ${error.message}`);
  }

  if (!data) return null;

  const [article] = await fillMissingImages([toArticle(data as ArticleRow)]);
  return article;
}
