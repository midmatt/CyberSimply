// summarize-articles.mjs
// Summarizes stored articles and backfills structured fields without truncation.
// Run with: node summarize-articles.mjs

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

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
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
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
const anthropic = new Anthropic({ apiKey: requiredEnv.ANTHROPIC_API_KEY });

const BATCH_SIZE = Number(process.env.SUMMARY_BATCH_SIZE || 25);

// Fail the job when more than this share of attempted articles fail.
const FAILURE_RATE_THRESHOLD = Number(process.env.SUMMARY_FAILURE_THRESHOLD || 0.5);

// Haiku tier: this runs once per article, so cost per call matters more than depth.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

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

// Structured outputs: the API constrains the response to this schema, so a
// well-formed object is guaranteed rather than hoped for. Every object needs
// `additionalProperties: false` and a complete `required` list.
const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
      enum: ['cybersecurity', 'hacking', 'general'],
      description: 'Best-fit category for the article.',
    },
    what: {
      type: 'string',
      description: '1-2 complete sentences describing what happened.',
    },
    impact: {
      type: 'string',
      description: '1-2 complete sentences on real-world impact.',
    },
    takeaways: {
      type: 'string',
      description: '2-3 bullet points in a single string, each line starting with "- ".',
    },
    why_this_matters: {
      type: 'string',
      description: '1-2 complete sentences explaining why this matters.',
    },
  },
  required: ['category', 'what', 'impact', 'takeaways', 'why_this_matters'],
  additionalProperties: false,
};

async function summarizeArticle(article) {
  const prompt = `
Summarize the article below for a general (non-technical) audience, using COMPLETE
sentences. Do not trail off or use ellipses. Every sentence must end with punctuation.

Title: ${article.title || 'Unknown title'}
Summary: ${article.summary || 'No summary available'}
Source: ${article.source || 'Unknown'}`.trim();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.35,
    system:
      'You write concise, fully-finished summaries of cybersecurity news for a general audience. End every sentence with punctuation.',
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema: SUMMARY_SCHEMA } },
  });

  // Fail loudly on the two ways this can come back unusable. Silently accepting
  // either is what let the previous outage go unnoticed.
  if (response.stop_reason === 'refusal') {
    throw new Error('model refused to summarize this article');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('response truncated at max_tokens; JSON is incomplete');
  }

  // content is a list of typed blocks — pick the text block rather than indexing [0].
  const text = response.content.find((block) => block.type === 'text')?.text;
  if (!text) {
    throw new Error(`no text block in response (stop_reason=${response.stop_reason})`);
  }

  return JSON.parse(text);
}

async function processBatch() {
  const articles = await fetchArticlesNeedingSummary();

  if (articles.length === 0) {
    console.log('✅ No articles need summarization.');
    return { success: 0, failures: 0 };
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

    await wait(800); // throttle Anthropic usage
  }

  console.log('\n' + '='.repeat(60));
  console.log(`🎯 Summary complete: ${success} success, ${failures} failed`);
  console.log('='.repeat(60));

  return { success, failures };
}

async function main() {
  try {
    console.log('🚀 Starting summarization job...');
    const { success, failures } = await processBatch();
    const attempted = success + failures;

    writeJobSummary(
      [
        '## 🧠 Summarize Articles',
        '',
        '| Metric | Count |',
        '| --- | ---: |',
        `| Attempted | ${attempted} |`,
        `| Summarized | ${success} |`,
        `| Failed | ${failures} |`,
        `| Model | \`${MODEL}\` |`,
        '',
        attempted === 0
          ? '✅ No articles needed summarization.'
          : success === 0
            ? '❌ **Zero summaries written — every article failed.**'
            : failures > 0
              ? `⚠️ ${failures}/${attempted} failed.`
              : '✅ All articles summarized.',
      ].join('\n')
    );

    // Nothing to summarize is a legitimately green run.
    if (attempted === 0) {
      return;
    }

    // Every per-article failure path lands here: JSON parse errors, Supabase
    // write errors, and the refusal / max_tokens guards in summarizeArticle,
    // which throw rather than returning a partial object. A run that "handled"
    // every error cleanly but wrote nothing is a failed run, not a green one.
    if (success === 0) {
      console.error(`💥 All ${attempted} article(s) failed to summarize. Failing the job.`);
      process.exit(1);
    }

    const failureRate = failures / attempted;
    if (failureRate > FAILURE_RATE_THRESHOLD) {
      console.error(
        `💥 Failure rate ${(failureRate * 100).toFixed(0)}% (${failures}/${attempted}) exceeds ` +
          `${(FAILURE_RATE_THRESHOLD * 100).toFixed(0)}% threshold. Failing the job.`
      );
      process.exit(1);
    }

    if (failures > 0) {
      console.warn(`⚠️ ${failures}/${attempted} article(s) failed, below the failure threshold.`);
    }
  } catch (err) {
    console.error('💥 Summarization job failed:', err);
    process.exit(1);
  }
}

main();
