// fetch-articles.js
// Unified script to fetch articles from NewsAPI + NewsData, deduplicate, auto-categorize with OpenAI, and store in Supabase
// Run with: node fetch-articles.js

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// --- Setup Supabase client ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- API keys ---
const newsApiKey = process.env.NEWS_API_KEY;
const newsDataKey = process.env.NEWSDATA_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

// --- Helper: wait/throttle ---
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Fetch from NewsAPI ---
async function fetchNewsAPIArticles() {
  const response = await fetch(
    `https://newsapi.org/v2/everything?q=cybersecurity&apiKey=${newsApiKey}&pageSize=20&sortBy=publishedAt&language=en`
  );
  if (!response.ok) throw new Error(`NewsAPI failed: ${response.statusText}`);
  const data = await response.json();
  if (data.status !== 'ok') throw new Error(`NewsAPI error: ${data.message}`);
  return data.articles.map((a) => ({
    title: a.title,
    summary: a.description || '',
    source_url: a.url, // NewsAPI uses 'url'
    source: a.source?.name || 'NewsAPI',
    author: a.author,
    published_at: a.publishedAt ? new Date(a.publishedAt).toISOString() : new Date().toISOString(),
    image_url: a.urlToImage,
    category: '', // Will be filled later
  }));
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
    source: a.source_id || 'NewsData',
    author: a.creator ? a.creator.join(', ') : null,
    published_at: a.pubDate ? new Date(a.pubDate).toISOString() : new Date().toISOString(),
    image_url: a.image_url || null,
    category: a.category && a.category.length ? a.category[0] : '',
  }));
}

// --- Categorize with OpenAI ---
async function categorizeArticle(title, summary) {
  if (!openaiApiKey) return 'general';
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a classifier. Return ONE word: cybersecurity, hacking, or general.',
          },
          {
            role: 'user',
            content: `Title: ${title}\nSummary: ${summary}\n\nCategory:`,
          },
        ],
        max_tokens: 10,
        temperature: 0.3,
      }),
    });
    const json = await response.json();
    const cat = json.choices?.[0]?.message?.content?.trim().toLowerCase() || 'general';
    
    // Ensure it's one of our valid categories
    if (['cybersecurity', 'hacking', 'general'].includes(cat)) {
      return cat;
    }
    return 'general';
  } catch (err) {
    console.error('❌ OpenAI categorization failed:', err.message);
    return 'general';
  }
}

// --- Summarize with OpenAI ---
async function summarizeArticleWithOpenAI(title, summary) {
  if (!openaiApiKey) {
    return { 
      what: 'N/A', 
      impact: 'N/A', 
      takeaways: 'N/A', 
      why_this_matters: 'N/A', 
      success: false 
    };
  }
  
  try {
    const prompt = `Analyze this article and return JSON with:
- what: What happened (1-2 sentences)
- impact: Real-world impact (1-2 sentences)
- takeaways: Key takeaways (2-3 bullet points as a single string)
- why_this_matters: Why this matters (1-2 sentences)

Title: ${title}
Summary: ${summary}

Respond ONLY with valid JSON.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You summarize cybersecurity news into structured JSON fields.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 400,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });
    
    const json = await response.json();
    const content = json.choices?.[0]?.message?.content || '{}';
    
    let parsed = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      console.warn('⚠️ Failed to parse AI response, using defaults');
    }
    
    return {
      what: parsed.what || 'N/A',
      impact: parsed.impact || 'N/A',
      takeaways: parsed.takeaways || 'N/A',
      why_this_matters: parsed.why_this_matters || 'N/A',
      success: true,
    };
  } catch (err) {
    console.error('❌ OpenAI summarization failed:', err.message);
    return { 
      what: 'N/A', 
      impact: 'N/A', 
      takeaways: 'N/A', 
      why_this_matters: 'N/A', 
      success: false 
    };
  }
}

// --- Generate fallback summary ---
async function generateFallbackSummary(title) {
  if (!openaiApiKey) return 'N/A';
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Generate a brief summary for this article title.' },
          { role: 'user', content: `Title: ${title}\n\nSummary:` },
        ],
        max_tokens: 60,
        temperature: 0.5,
      }),
    });
    
    const json = await response.json();
    return json.choices?.[0]?.message?.content?.trim() || 'N/A';
  } catch (err) {
    console.error('❌ Fallback summary generation failed:', err.message);
    return 'N/A';
  }
}

// --- Store articles in Supabase ---
async function storeArticles(articles) {
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    
    // Skip if title or source_url is missing
    if (!article.title?.trim()) {
      console.log(`⚠️ [${i + 1}/${articles.length}] Skipping article with empty title`);
      continue;
    }
    
    if (!article.source_url?.trim()) {
      console.log(`⚠️ [${i + 1}/${articles.length}] Skipping article with empty source_url: "${article.title.substring(0, 50)}..."`);
      continue;
    }

    try {
      // Ensure summary is non-empty
      let summary = article.summary?.trim();
      if (!summary) {
        summary = await generateFallbackSummary(article.title);
        console.log(`   ℹ️ Generated fallback summary`);
      }
      summary = summary || 'N/A';

      // Ensure category is valid
      let category = article.category?.trim();
      if (!category || !['cybersecurity', 'hacking', 'general'].includes(category)) {
        category = await categorizeArticle(article.title, summary);
        console.log(`   ℹ️ Category assigned: ${category}`);
        await wait(250); // Throttle between categorization calls
      }
      category = category || 'general';

      // Get AI summary fields
      console.log(`   🤖 Generating AI summary...`);
      const aiSummary = await summarizeArticleWithOpenAI(article.title, summary);
      await wait(250); // Throttle between summarization calls

      // Force non-empty values
      const what = aiSummary.what?.trim() || 'N/A';
      const impact = aiSummary.impact?.trim() || 'N/A';
      const takeaways = aiSummary.takeaways?.trim() || 'N/A';
      const why_this_matters = aiSummary.why_this_matters?.trim() || 'N/A';

      // Build record WITHOUT explicit id - let DB handle it
      const record = {
        title: article.title,
        summary,
        source_url: article.source_url,
        redirect_url: article.source_url, // Also set redirect_url
        source: article.source || 'Unknown',
        author: article.author,
        published_at: article.published_at,
        image_url: article.image_url,
        category,
        what,
        impact,
        takeaways,
        why_this_matters,
        ai_summary_generated: aiSummary.success,
      };

      // Log before upsert
      console.log(`→ [${i + 1}/${articles.length}] Upserting:`, {
        title: record.title.substring(0, 50) + '...',
        source_url: record.source_url.substring(0, 50) + '...',
        category: record.category,
        ai_summary_generated: record.ai_summary_generated,
        has_what: what !== 'N/A',
        has_impact: impact !== 'N/A',
        has_takeaways: takeaways !== 'N/A'
      });

      // Upsert by source_url (not id)
      const { error } = await supabase
        .from('articles')
        .upsert(record, { onConflict: 'source_url' });

      if (error) {
        console.error(`   ❌ Failed to upsert:`, {
          title: article.title.substring(0, 50),
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        errorCount++;
      } else {
        console.log(`   ✅ Stored successfully`);
        successCount++;
      }

    } catch (err) {
      console.error(`   ❌ Error processing article:`, err.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Storage complete: ${successCount} success, ${errorCount} errors`);
  console.log('='.repeat(60));
}

// --- Main flow ---
async function main() {
  try {
    console.log('🚀 Starting article fetch process...');
    console.log('='.repeat(60));

    console.log('🔄 Fetching NewsAPI articles...');
    const newsAPIArticles = await fetchNewsAPIArticles();
    console.log(`   ✅ Fetched ${newsAPIArticles.length} NewsAPI articles`);

    console.log('🔄 Fetching NewsData articles...');
    const newsDataArticles = await fetchNewsDataArticles();
    console.log(`   ✅ Fetched ${newsDataArticles.length} NewsData articles`);

    // Deduplicate by source_url (primary) and title (secondary)
    const seenUrls = new Set();
    const seenTitles = new Set();
    const merged = [];
    let skippedDuplicates = 0;

    // Process NewsAPI articles first (preferred source)
    for (const art of newsAPIArticles) {
      if (!art.source_url?.trim()) {
        console.log(`⚠️ Skipping NewsAPI article without URL: ${art.title}`);
        continue;
      }
      
      if (!seenUrls.has(art.source_url) && !seenTitles.has(art.title)) {
        seenUrls.add(art.source_url);
        seenTitles.add(art.title);
        merged.push(art);
      } else {
        skippedDuplicates++;
      }
    }

    // Process NewsData articles
    for (const art of newsDataArticles) {
      if (!art.source_url?.trim()) {
        console.log(`⚠️ Skipping NewsData article without URL: ${art.title}`);
        continue;
      }
      
      if (!seenUrls.has(art.source_url) && !seenTitles.has(art.title)) {
        seenUrls.add(art.source_url);
        seenTitles.add(art.title);
        merged.push(art);
      } else {
        skippedDuplicates++;
      }
    }

    console.log(`⚠️ Skipped ${skippedDuplicates} duplicate articles`);
    console.log(`📦 Preparing to store ${merged.length} unique articles`);
    console.log('='.repeat(60));

    await storeArticles(merged);
    
    console.log('\n✅ Finished fetching & storing articles');
    
  } catch (err) {
    console.error('❌ Script failed:', err);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  }
}

main();