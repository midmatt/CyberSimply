// fetch-more-articles.js
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

// --- Setup Supabase client ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Example function to fetch NewsAPI articles
async function fetchNewsAPIArticles() {
  const response = await fetch(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${process.env.NEWS_API_KEY}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch NewsAPI articles: ${response.statusText}`);
  }
  const data = await response.json();
  return data.articles.map(article => ({
    title: article.title,
    source: 'NewsAPI',
    published_at: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
    summary: article.description
  }));
}

// Example function to fetch NewsData articles
async function fetchNewsDataArticles() {
  const response = await fetch(`https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch NewsData articles: ${response.statusText}`);
  }
  const data = await response.json();
  return data.results.map(article => ({
    title: article.title,
    source: 'NewsData',
    published_at: article.pubDate ? new Date(article.pubDate).toISOString() : new Date().toISOString(),
    summary: article.description
  }));
}

// Store fetched articles into Supabase
async function storeArticles(articles) {
  for (const article of articles) {
    const { error } = await supabase
      .from('articles')
      .upsert({
        id: uuidv4(),
        title: article.title,
        source: article.source,
        published_at: article.published_at,
        summary: article.summary,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error(`❌ Failed to insert article: ${article.title}`, error);
    } else {
      console.log(`✅ Stored article: ${article.title}`);
    }
  }
}

async function main() {
  try {
    console.log('🔄 Fetching NewsAPI articles...');
    const newsAPIArticles = await fetchNewsAPIArticles();
    console.log(`📥 Retrieved ${newsAPIArticles.length} NewsAPI articles`);

    console.log('🔄 Fetching NewsData articles...');
    const newsDataArticles = await fetchNewsDataArticles();
    console.log(`📥 Retrieved ${newsDataArticles.length} NewsData articles`);

    // Deduplicate articles by title, preferring NewsAPI articles
    const seenTitles = new Set();
    const mergedArticles = [];
    let skippedDuplicates = 0;

    for (const article of newsAPIArticles) {
      if (!seenTitles.has(article.title)) {
        seenTitles.add(article.title);
        mergedArticles.push(article);
      }
    }

    for (const article of newsDataArticles) {
      if (!seenTitles.has(article.title)) {
        seenTitles.add(article.title);
        mergedArticles.push(article);
      } else {
        skippedDuplicates++;
      }
    }

    console.log(`⚠️ Skipped ${skippedDuplicates} duplicate articles`);

    await storeArticles(mergedArticles);
    console.log('✅ Finished storing articles.');
  } catch (err) {
    console.error('❌ Script failed:', err);
    process.exit(1);
  }
}

main();
