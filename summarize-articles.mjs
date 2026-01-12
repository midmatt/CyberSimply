// summarize-articles.mjs
// Summarizes stored articles and backfills structured fields without truncation.
// Run with: node summarize-articles.mjs

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Ensure fetch is available (GitHub-hosted runners on Node 20 have it,
// but this guards any fallback environments)
if (typeof globalThis.fetch === 'undefined') {
  const { default: fetch } = await import('node-fetch');
  globalThis.fetch = fetch;
}

// Validate required env upfront for clear failures
const requiredEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

const missing = Object.entries(requiredEnv)
  .filter(([, v]) => !v || `${v}`.trim() === '')
  .map(([k]) => k);

if (missing.length) {
  console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

if (!requiredEnv.SUPABASE_URL.startsWith('http')) {
  console.error('❌ SUPABASE_URL is not a valid URL');
  process.exit(1);
}

const supabase = createClient(requiredEnv.SUPABASE_URL, requiredEnv.SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: requiredEnv.OPENAI_API_KEY });

const BATCH_SIZE = Number(process.env.SUMMARY_BATCH_SIZE || 25);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const needsSummary = (article) => {
  const missing = (value) =>
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'string' && value.trim().toUpperCase() === 'N/A');

  return (
    !article?.ai_summary_generated ||
    missing(article.what) ||
    missing(article.impact) ||
    missing(article.takeaways) ||
    missing(article.why_this_matters)
  );
};

const fetchArticlesNeedingSummary = async () => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select(
        'id, title, summary, source, source_url, category, what, impact, takeaways, why_this_matters, ai_summary_generated'
      )
      .order('published_at', { ascending: false })
      .limit(200);

    if (error) {
      throw new Error(`Supabase query error: ${error.message}`);
    }

    return (data || []).filter(needsSummary).slice(0, BATCH_SIZE);
  } catch (err) {
    const maskedUrl = (() => {
      try {
        const url = new URL(requiredEnv.SUPABASE_URL);
        return `${url.origin}`;
      } catch {
        return '<invalid-url>';
      }
    })();
    throw new Error(`Failed to load articles: ${err.message} (supabase=${maskedUrl})`);
  }
};

const ensureSentence = (text) => {
  if (!text) return 'N/A';
  const trimmed = text.trim();
  if (!trimmed) return 'N/A';
  const last = trimmed.slice(-1);
  if (!'.!?'.includes(last)) {
    return `${trimmed}.`;
  }
  return trimmed;
};

const normalizeTakeaways = (text) => {
  if (!text) return 'N/A';
  const bullets = text
    .split(/\r?\n|•|-/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (bullets.length === 0) return 'N/A';

  return bullets
    .slice(0, 4)
    .map((b) => (/[.!?]$/.test(b) ? b : `${b}.`))
    .map((b) => `- ${b}`)
    .join('\n');
};

const normalizeCategory = (value) => {
  const allowed = ['cybersecurity', 'hacking', 'general'];
  if (!value) return 'general';
  const normalized = value.trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : 'general';
};

async function summarizeArticle(article) {
  const prompt = `
Summarize the article below with COMPLETE sentences. Do not trail off or use ellipses.
Return valid JSON with these exact fields:
- category: one of "cybersecurity", "hacking", or "general"
- what: 1-2 complete sentences describing what happened
- impact: 1-2 complete sentences on real-world impact
- takeaways: 2-3 bullet points as a single string, each bullet starting with "- "
- why_this_matters: 1-2 complete sentences explaining importance

Title: ${article.title || 'Unknown title'}
Summary: ${article.summary || 'No summary available'}
Source: ${article.source || 'Unknown'}

Ensure every sentence is complete and ends with punctuation.`.trim();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You write concise, fully-finished summaries for cybersecurity news. Always return valid JSON and end sentences with punctuation.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.35,
    max_tokens: 700,
  });

  const content = response.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
}

async function processBatch() {
  const articles = await fetchArticlesNeedingSummary();

  if (articles.length === 0) {
    console.log('✅ No articles need summarization.');
    return;
  }

  console.log(`🧠 Summarizing ${articles.length} article(s)...`);

  let success = 0;
  let failures = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    console.log(`\n[${i + 1}/${articles.length}] ${article.title?.substring(0, 80) || 'Untitled'}`);

    try {
      const result = await summarizeArticle(article);

      const update = {
        category: normalizeCategory(result.category || article.category),
        what: ensureSentence(result.what),
        impact: ensureSentence(result.impact),
        takeaways: normalizeTakeaways(result.takeaways),
        why_this_matters: ensureSentence(result.why_this_matters),
        ai_summary_generated: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('articles').update(update).eq('id', article.id);
      if (error) {
        throw new Error(error.message);
      }

      console.log(
        `   ✅ Updated summary (category=${update.category}, has_takeaways=${update.takeaways !== 'N/A'})`
      );
      success++;
    } catch (err) {
      console.error(`   ❌ Failed to summarize: ${err.message}`);
      failures++;
    }

    await wait(800); // throttle OpenAI usage
  }

  console.log('\n' + '='.repeat(60));
  console.log(`🎯 Summary complete: ${success} success, ${failures} failed`);
  console.log('='.repeat(60));
}

async function main() {
  try {
    console.log('🚀 Starting summarization job...');
    await processBatch();
  } catch (err) {
    console.error('💥 Summarization job failed:', err);
    process.exit(1);
  }
}

main();
