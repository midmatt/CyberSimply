// fetch-articles.mjs
// Fetches raw articles (no AI summarization) and stores clean metadata in Supabase.
// Run with: node fetch-articles.mjs

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Surfaces run results on the GitHub Actions run page. No-op outside CI.
const writeJobSummary = (markdown) => {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) return;
  try {
    fs.appendFileSync(target, `${markdown}\n`);
  } catch (err) {
    console.warn(`⚠️ Could not write job summary: ${err.message}`);
  }
};

// --- Setup Supabase client ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- API keys ---
const newsApiKey = process.env.NEWS_API_KEY;
const newsDataKey = process.env.NEWSDATA_API_KEY;

// --- Helper: wait/throttle ---
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fail the job when more than this share of store attempts error. Tolerates
// occasional articles_title_unique collisions; catches systemic breakage like
// the articles_category_check failures that silently dropped ~25% per run.
const STORE_ERROR_THRESHOLD = Number(process.env.STORE_ERROR_THRESHOLD || 0.2);

// Providers mix real reporting with PyPI release notifications ("vulnclaw 0.3.8"),
// vendor forum posts ("Hello everyone,"), and rows whose title came from a URL
// slug ("begun development"). Rejecting them here keeps the feed clean at the
// source. Mirrors src/utils/articleQuality.ts — keep the two in sync.
const PACKAGE_RELEASE_RE = /^[a-z0-9][a-z0-9._-]*\s+v?\d+\.\d+(\.\d+)?(\.[a-z0-9]+)?$/;

const isDisplayableHeadline = (title) => {
  const trimmed = (title ?? '').trim();
  if (!trimmed) return false;
  if (PACKAGE_RELEASE_RE.test(trimmed)) return false;
  if (trimmed.endsWith(',')) return false;
  // A colon signals a terse but real headline ("Review: CTRL+ALT+PWN").
  if (trimmed.includes(':')) return true;
  // CJK headlines carry few spaces, so length rescues them from the word count.
  if (trimmed.split(/\s+/).length < 3 && trimmed.length < 30) return false;
  return true;
};

// --- Helpers for URL validation/cleanup ---
const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const cleanUrl = (value) => {
  if (!isValidHttpUrl(value)) return null;
  const url = new URL(value);
  // Strip common tracking params to keep canonical URLs
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ocid'].forEach((k) =>
    url.searchParams.delete(k)
  );
  return url.toString();
};

// Mirrors the helper in summarize-articles.mjs. The articles_category_check
// constraint only permits these three values, so provider categories
// ("technology", "top", "business", ...) and NewsAPI's null must be mapped
// before insert or the row is rejected outright.
const normalizeCategory = (value) => {
  const allowed = ['cybersecurity', 'hacking', 'general'];
  if (!value) return 'general';
  const normalized = `${value}`.trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : 'general';
};

// Mirrors cleanSummaryText in src/utils/textUtils.ts. Provider `description`
// fields arrive with feed artifacts baked in: a leaked list-item number, the
// headline repeated ahead of the body, a space orphaned before a hyphen or a
// full stop by the feed's HTML-to-text conversion, and the syndication footer
// ("This News <title> appeared first on <publication>"). Repairing on write
// keeps them out of the column; the app repairs on read for rows already stored.
const SYNDICATION_FOOTER_RE =
  /\s*(?:the post|this post|this news|this article|the article|this story)\b[\s\S]*?\bappeared first on\b[\s\S]*$/i;

const normalizeForCompare = (text) =>
  text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const cleanSummary = (summary, title) => {
  if (!summary) return '';

  let text = `${summary}`.replace(/\s+/g, ' ').trim();

  text = text.replace(SYNDICATION_FOOTER_RE, '');

  // An explicit marker ("1. ", "2) ") is unambiguous and always goes.
  text = text.replace(/^\s*\d{1,3}\s*[.):\]]\s+/, '');

  if (title) {
    const normalizedTitle = normalizeForCompare(title);
    // A bare leading number is ambiguous ("5 million records were exposed"), so
    // it is only dropped when the headline follows it.
    const withoutNumber = text.replace(/^\s*\d{1,3}\s+/, '');
    if (normalizedTitle && normalizeForCompare(withoutNumber).startsWith(normalizedTitle)) {
      text = withoutNumber.slice(normalizedTitle.length).replace(/^[\s\-–—:.,|]+/, '');
    }
  }

  // A space before a hyphen with none after it is damage; a spaced dash used as
  // punctuation has spaces on both sides and is left alone.
  text = text.replace(/([A-Za-z0-9])\s+-([A-Za-z0-9])/g, '$1-$2');
  text = text.replace(/\s+([.,;:!?])/g, '$1');

  return text.trim();
};

const publicationFrom = (source, url) => {
  if (source?.trim()) return source.trim();
  if (!isValidHttpUrl(url)) return 'Unknown';
  const host = new URL(url).hostname.replace(/^www\./, '');
  return host || 'Unknown';
};

const baseRecordFrom = (article) => {
  const sourceUrl = cleanUrl(article.source_url);
  const imageUrl = cleanUrl(article.image_url);
  const title = article.title?.trim();
  return {
    title,
    summary: cleanSummary(article.summary, title),
    source_url: sourceUrl,
    redirect_url: sourceUrl,
    source: publicationFrom(article.source, sourceUrl),
    author: article.author?.trim() || null,
    published_at: article.published_at || new Date().toISOString(),
    image_url: imageUrl,
    category: normalizeCategory(article.category),
    ai_summary_generated: false,
    what: null,
    impact: null,
    takeaways: null,
    why_this_matters: null,
  };
};

// --- Fetch from NewsAPI ---
async function fetchNewsAPIArticles() {
  try {
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=cybersecurity&apiKey=${newsApiKey}&pageSize=30&sortBy=publishedAt&language=en`
    );

    if (!response.ok) {
      throw new Error(`NewsAPI HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check for rate limit error
    if (data.status === 'error') {
      if (data.code === 'rateLimited' || data.message?.toLowerCase().includes('too many requests')) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      throw new Error(`NewsAPI error: ${data.code} - ${data.message}`);
    }

    if (data.status !== 'ok') {
      throw new Error(`NewsAPI error: ${data.message}`);
    }

    return data.articles.map((a) => ({
      title: a.title,
      summary: a.description || '',
      source_url: a.url, // NewsAPI uses 'url'
      source: a.source?.name || null,
      author: a.author,
      published_at: a.publishedAt ? new Date(a.publishedAt).toISOString() : new Date().toISOString(),
      image_url: a.urlToImage,
      category: null,
    }));
  } catch (error) {
    error.isRateLimit = error.message === 'RATE_LIMIT_EXCEEDED';
    throw error;
  }
}

// --- Fetch from NewsData.io ---
async function fetchNewsDataArticles() {
  const response = await fetch(
    `https://newsdata.io/api/1/news?apikey=${newsDataKey}&q=cybersecurity&language=en`
  );
  if (!response.ok) throw new Error(`NewsData failed: ${response.statusText}`);
  const data = await response.json();
  if (!data.results) return [];
  return data.results.map((a) => ({
    title: a.title,
    summary: a.description || '',
    source_url: a.link, // NewsData uses 'link'
    source: a.source_id || null,
    author: Array.isArray(a.creator) ? a.creator.filter(Boolean).join(', ') : a.creator || null,
    published_at: a.pubDate ? new Date(a.pubDate).toISOString() : new Date().toISOString(),
    image_url: a.image_url || null,
    category: Array.isArray(a.category) && a.category.length ? a.category[0] : null,
  }));
}

// --- Store articles in Supabase (insert-only on URL conflict) ---
async function storeArticles(articles) {
  let insertedCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = baseRecordFrom(articles[i]);

    if (!article.title) {
      skippedCount++;
      console.log(`⚠️ [${i + 1}/${articles.length}] Skipping article with empty title`);
      continue;
    }

    if (!isDisplayableHeadline(article.title)) {
      skippedCount++;
      console.log(
        `⚠️ [${i + 1}/${articles.length}] Skipping non-article headline: "${article.title}"`
      );
      continue;
    }

    if (!article.source_url || !isValidHttpUrl(article.source_url)) {
      skippedCount++;
      console.log(
        `⚠️ [${i + 1}/${articles.length}] Skipping article with invalid URL: "${articles[i].title?.substring(0, 80) || 'no title'}"`
      );
      continue;
    }

    try {
      console.log(`→ [${i + 1}/${articles.length}] Inserting:`, {
        title: article.title.substring(0, 60) + (article.title.length > 60 ? '...' : ''),
        source_url: article.source_url,
        source: article.source,
      });

      // ignoreDuplicates issues ON CONFLICT DO NOTHING, which returns no error
      // when the row already exists. Without .select() a no-op conflict was
      // indistinguishable from a real insert, so "inserted" counted both.
      // .select() returns only rows actually written.
      const { data, error } = await supabase
        .from('articles')
        .upsert(article, { onConflict: 'source_url', ignoreDuplicates: true })
        .select('id');

      if (error) {
        console.error(`   ❌ Failed to upsert: ${error.message}`);
        errorCount++;
      } else if (data && data.length > 0) {
        insertedCount++;
      } else {
        duplicateCount++;
        console.log(`   ↪️ Already present, no row written`);
      }
    } catch (err) {
      console.error(`   ❌ Error processing article: ${err.message}`);
      errorCount++;
    }

    // Light throttle to avoid API burst on Supabase
    await wait(150);
  }

  console.log('\n' + '='.repeat(60));
  console.log(
    `📊 Storage complete: ${insertedCount} inserted, ${duplicateCount} already present, ` +
      `${skippedCount} skipped, ${errorCount} errors`
  );
  console.log('='.repeat(60));

  return { insertedCount, duplicateCount, skippedCount, errorCount };
}

// --- Cleanup any duplicate rows already in the table (keep oldest id per source_url) ---
async function cleanupDuplicates() {
  try {
    // Fetch a window of recent rows; adjust limit if the table is large
    const { data, error } = await supabase
      .from('articles')
      .select('id, source_url')
      .order('id', { ascending: true })
      .limit(5000);

    if (error) throw error;
    if (!data || data.length === 0) return;

    const seen = new Map(); // url -> keepId
    const toDelete = [];

    for (const row of data) {
      const url = cleanUrl(row.source_url);
      if (!url) continue;
      if (!seen.has(url)) {
        seen.set(url, row.id);
      } else {
        toDelete.push(row.id);
      }
    }

    if (toDelete.length === 0) {
      console.log('🧹 No duplicate rows to delete.');
      return;
    }

    console.log(`🧹 Removing ${toDelete.length} duplicate rows (by source_url)`);
    const { error: delError } = await supabase.from('articles').delete().in('id', toDelete);
    if (delError) throw delError;
    console.log('🧹 Duplicate cleanup complete.');
  } catch (err) {
    console.error('⚠️ Duplicate cleanup skipped:', err.message);
  }
}

// --- Main flow ---
async function main() {
  try {
    console.log('🚀 Starting article fetch process...');
    console.log('='.repeat(60));

    let newsAPIArticles = [];
    let newsAPIFailed = false;
    let usedFallback = false;

    // Try NewsAPI first
    console.log('🔄 Fetching NewsAPI articles...');
    try {
      newsAPIArticles = await fetchNewsAPIArticles();
      console.log(`   ✅ Fetched ${newsAPIArticles.length} NewsAPI articles`);
    } catch (error) {
      newsAPIFailed = true;

      if (error.isRateLimit) {
        console.log('   ⚠️  NewsAPI rate limit exceeded - falling back to NewsDataAPI only');
        usedFallback = true;
      } else {
        console.error('   ❌ NewsAPI fetch failed:', error.message);
      }
    }

    // Fetch NewsData articles
    console.log('🔄 Fetching NewsData articles...');
    let newsDataArticles = [];
    try {
      newsDataArticles = await fetchNewsDataArticles();
      console.log(`   ✅ Fetched ${newsDataArticles.length} NewsData articles`);
    } catch (error) {
      console.error('   ❌ NewsData fetch failed:', error.message);

      if (newsAPIFailed) {
        console.error('');
        console.error('❌ CRITICAL: Both NewsAPI and NewsDataAPI failed');
        console.error('   Please check API keys and rate limits');
        process.exit(1);
      }
    }

    if (newsAPIArticles.length === 0 && newsDataArticles.length === 0) {
      console.error('\n❌ No articles fetched from any source');
      process.exit(1);
    }

    if (usedFallback) {
      console.log('');
      console.log('⚠️  FALLBACK MODE ACTIVE');
      console.log(`   Using only NewsDataAPI (${newsDataArticles.length} articles)`);
      console.log('   NewsAPI will be available again after rate limit resets');
      console.log('');
    }

    // Deduplicate by URL first, then by title
    const seenUrls = new Set();
    const seenTitles = new Set();
    const merged = [];
    let skippedDuplicates = 0;

    const maybeAdd = (art) => {
      const url = cleanUrl(art.source_url);
      const title = art.title?.trim();
      if (!url || !title) return;
      if (!seenUrls.has(url) && !seenTitles.has(title)) {
        seenUrls.add(url);
        seenTitles.add(title);
        merged.push({ ...art, source_url: url });
      } else {
        skippedDuplicates++;
      }
    };

    newsAPIArticles.forEach(maybeAdd);
    newsDataArticles.forEach(maybeAdd);

    console.log(`⚠️ Skipped ${skippedDuplicates} duplicate articles`);
    console.log(`📦 Preparing to store ${merged.length} unique articles`);
    console.log('='.repeat(60));

    const storage = await storeArticles(merged);
    await cleanupDuplicates();

    console.log('\n✅ Finished fetching & storing articles');
    console.log('');
    console.log('📊 Fetch Summary:');
    console.log(`   NewsAPI: ${newsAPIArticles.length} articles${newsAPIFailed ? ' (FAILED)' : ''}`);
    console.log(`   NewsData: ${newsDataArticles.length} articles`);
    console.log(`   Total unique: ${merged.length} articles`);
    console.log(`   Newly stored: ${storage.insertedCount} articles`);
    if (usedFallback) {
      console.log('   ⚠️  Fallback mode was used due to NewsAPI rate limit');
    }

    writeJobSummary(
      [
        '## 📰 Fetch Articles',
        '',
        '| Metric | Count |',
        '| --- | ---: |',
        `| NewsAPI fetched | ${newsAPIArticles.length}${newsAPIFailed ? ' (FAILED)' : ''} |`,
        `| NewsData fetched | ${newsDataArticles.length} |`,
        `| Unique after dedup | ${merged.length} |`,
        `| **Newly stored** | **${storage.insertedCount}** |`,
        `| Already present | ${storage.duplicateCount} |`,
        `| Skipped (bad title/URL) | ${storage.skippedCount} |`,
        `| Errors | ${storage.errorCount} |`,
        '',
        usedFallback ? '⚠️ Fallback mode: NewsAPI rate-limited, used NewsData only.\n' : '',
        storage.errorCount > 0
          ? `❌ **${storage.errorCount} article(s) failed to store.**`
          : storage.insertedCount === 0
            ? 'ℹ️ No new articles — everything fetched was already in the database.'
            : `✅ Stored ${storage.insertedCount} new article(s).`,
      ].join('\n')
    );

    // Storing nothing is normal (everything was already present). Storing
    // nothing *because inserts are failing* is not.
    //
    // Not every store error is systemic: articles_title_unique means a headline
    // republished at a new URL collides and errors, which is expected noise.
    // Paging on a single collision would recreate the alert fatigue that let
    // this outage run for 57 days, so fail on the rate, not on the count.
    const attemptedStores = storage.insertedCount + storage.duplicateCount + storage.errorCount;
    const storeErrorRate = attemptedStores > 0 ? storage.errorCount / attemptedStores : 0;

    if (storeErrorRate > STORE_ERROR_THRESHOLD) {
      console.error(
        `\n❌ ${storage.errorCount}/${attemptedStores} article(s) failed to store ` +
          `(${(storeErrorRate * 100).toFixed(0)}%), above the ` +
          `${(STORE_ERROR_THRESHOLD * 100).toFixed(0)}% threshold. Failing the job.`
      );
      process.exit(1);
    }

    if (storage.errorCount > 0) {
      console.warn(`⚠️ ${storage.errorCount}/${attemptedStores} store error(s), below the threshold.`);
    }
  } catch (err) {
    console.error('❌ Script failed:', err);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  }
}

main();