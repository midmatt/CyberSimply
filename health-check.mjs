// health-check.mjs
// Freshness assertion for the article pipeline.
//
// This is deliberately NOT part of the per-run success/failure accounting in
// summarize-articles.mjs. That logic answers "did this run work?"; this answers
// "is the data actually fresh?" — which catches the failure mode where every
// run is green but nothing new is arriving (e.g. fetch silently stores nothing,
// so summarize reports "no articles need summarization" and exits 0 forever).
//
// Run with: node health-check.mjs

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const requiredEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

const missing = Object.entries(requiredEnv)
  .filter(([, v]) => !v || `${v}`.trim() === '')
  .map(([k]) => k);

if (missing.length) {
  console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(requiredEnv.SUPABASE_URL, requiredEnv.SUPABASE_SERVICE_ROLE_KEY);

const FRESHNESS_HOURS = Number(process.env.FRESHNESS_WINDOW_HOURS || 48);

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

const countSince = async (cutoffIso, { summarizedOnly }) => {
  let query = supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .gt('created_at', cutoffIso);

  if (summarizedOnly) {
    query = query.eq('ai_summary_generated', true);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }
  return count ?? 0;
};

async function main() {
  const cutoff = new Date(Date.now() - FRESHNESS_HOURS * 60 * 60 * 1000).toISOString();
  console.log(`🩺 Freshness check: articles created since ${cutoff} (${FRESHNESS_HOURS}h window)`);

  let freshSummarized;
  let freshTotal;
  try {
    // Both counts, so the failure message can distinguish "nothing was fetched"
    // from "articles arrived but none were summarized".
    [freshSummarized, freshTotal] = await Promise.all([
      countSince(cutoff, { summarizedOnly: true }),
      countSince(cutoff, { summarizedOnly: false }),
    ]);
  } catch (err) {
    console.error(`💥 Health check could not run: ${err.message}`);
    writeJobSummary(`## 🩺 Pipeline Health\n\n❌ **Health check could not run:** ${err.message}`);
    process.exit(1);
  }

  const healthy = freshSummarized > 0;

  const diagnosis = healthy
    ? `✅ Pipeline is fresh — ${freshSummarized} summarized article(s) in the last ${FRESHNESS_HOURS}h.`
    : freshTotal > 0
      ? `❌ **${freshTotal} article(s) arrived in the last ${FRESHNESS_HOURS}h but none were summarized.** ` +
        'Fetch is working; summarization is not.'
      : `❌ **No articles at all in the last ${FRESHNESS_HOURS}h.** ` +
        'The pipeline is not running, or fetch is storing nothing.';

  writeJobSummary(
    [
      '## 🩺 Pipeline Health',
      '',
      '| Metric | Count |',
      '| --- | ---: |',
      `| Window | ${FRESHNESS_HOURS}h |`,
      `| Articles created | ${freshTotal} |`,
      `| Of those, summarized | ${freshSummarized} |`,
      '',
      diagnosis,
    ].join('\n')
  );

  console.log(`   articles created: ${freshTotal}`);
  console.log(`   of those, summarized: ${freshSummarized}`);

  if (!healthy) {
    console.error(`\n${diagnosis.replace(/\*\*/g, '')}`);
    process.exit(1);
  }

  console.log(`\n${diagnosis}`);
}

main();
