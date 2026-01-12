// fetch-articles.mjs
// Fetches raw articles (no AI summarization) and stores clean metadata in Supabase.
// Run with: node fetch-articles.mjs

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// --- Setup Supabase client ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- API keys ---
const newsApiKey = process.env.NEWS_API_KEY;
const newsDataKey = process.env.NEWSDATA_API_KEY;

// --- Helper: wait/throttle ---
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const publicationFrom = (source, url) => {
  if (source?.trim()) return source.trim();
  if (!isValidHttpUrl(url)) return 'Unknown';
  const host = new URL(url).hostname.replace(/^www\./, '');
  return host || 'Unknown';
};

const baseRecordFrom = (article) => {
  const sourceUrl = cleanUrl(article.source_url);
  const imageUrl = cleanUrl(article.image_url);
  return {
    title: article.title?.trim(),
    summary: (article.summary || '').trim(),
    source_url: sourceUrl,
    redirect_url: sourceUrl,
    source: publicationFrom(article.source, sourceUrl),
    author: article.author?.trim() || null,
    published_at: article.published_at || new Date().toISOString(),
    image_url: imageUrl,
    category: article.category?.trim() || null,
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
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = baseRecordFrom(articles[i]);

    if (!article.title) {
      skippedCount++;
      console.log(`⚠️ [${i + 1}/${articles.length}] Skipping article with empty title`);
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

      const { error } = await supabase
        .from('articles')
        .upsert(article, { onConflict: 'source_url', ignoreDuplicates: true });

      if (error) {
        console.error(`   ❌ Failed to upsert: ${error.message}`);
        errorCount++;
      } else {
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Error processing article: ${err.message}`);
      errorCount++;
    }

    // Light throttle to avoid API burst on Supabase
    await wait(150);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Storage complete: ${successCount} inserted, ${skippedCount} skipped, ${errorCount} errors`);
  console.log('='.repeat(60));
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

    await storeArticles(merged);
    await cleanupDuplicates();

    console.log('\n✅ Finished fetching & storing articles');
    console.log('');
    console.log('📊 Fetch Summary:');
    console.log(`   NewsAPI: ${newsAPIArticles.length} articles${newsAPIFailed ? ' (FAILED)' : ''}`);
    console.log(`   NewsData: ${newsDataArticles.length} articles`);
    console.log(`   Total unique: ${merged.length} articles`);
    if (usedFallback) {
      console.log('   ⚠️  Fallback mode was used due to NewsAPI rate limit');
    }
  } catch (err) {
    console.error('❌ Script failed:', err);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  }
}

main();