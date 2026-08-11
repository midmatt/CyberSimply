/**
 * Row shape of the Supabase `articles` table, the same table the GitHub Actions
 * pipeline (`fetch-articles.mjs`) writes and the mobile feed reads through
 * `directSupabaseService`. Kept in sync with `DirectArticle` there.
 */
export interface ArticleRow {
  id: string;
  title: string;
  source: string;
  author: string | null;
  published_at: string;
  summary: string;
  what: string | null;
  impact: string | null;
  takeaways: string | null;
  why_this_matters: string | null;
  redirect_url: string | null;
  image_url: string | null;
  category: string | null;
  ai_summary_generated: boolean | null;
}

/** An article after cleaning, ready to render. */
export interface Article extends ArticleRow {
  /** Provider summary with feed artifacts repaired. */
  cleanSummary: string;
  /** True when an AI explainer exists — drives the sparkle marker. */
  hasAiSummary: boolean;
}
