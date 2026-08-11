// breaking-news-check.mjs
//
// Detects severe, just-happened cybersecurity events and flags them as breaking.
// Runs every 30 minutes, completely separate from the daily digest pipeline in
// fetch-articles.mjs / summarize-articles.mjs — it shares nothing but the
// `articles` table and never touches the summarization queue.
//
// Pipeline: fetch recent candidates -> recency filter -> keyword prefilter ->
// Claude severity classification -> dedup/cooldown -> daily cap -> write
// article + record the push decision.
//
// Run with: node breaking-news-check.mjs

import fs from 'node:fs';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// ---------------------------------------------------------------------------
// Tuning constants. These are the knobs worth changing after watching a few
// days of Discord logs; everything else is mechanism.
// ---------------------------------------------------------------------------

/** Cron runs every 30 min; the extra 15 covers provider lag and clock skew. */
const RECENCY_WINDOW_MINUTES = Number(process.env.BREAKING_RECENCY_MINUTES || 45);

/** Below this the classifier is not sure enough to interrupt anyone's day. */
const MIN_CONFIDENCE = Number(process.env.BREAKING_MIN_CONFIDENCE || 4);

/** "other" never qualifies — that is the whole point of the rubric. */
const QUALIFYING_CATEGORIES = new Set(['breach', 'outage', 'active_attack', 'critical_vuln']);

/** An evolving story keeps producing articles; only notify once per window. */
const COOLDOWN_HOURS = Number(process.env.BREAKING_COOLDOWN_HOURS || 3);

/** Ceiling for a coordinated-attack day. Excess is logged, never dropped. */
const MAX_PUSHES_PER_DAY = Number(process.env.BREAKING_MAX_PUSHES_PER_DAY || 5);

/** Cap on classifier calls per run, so a provider flood cannot run up a bill. */
const MAX_CLASSIFICATIONS_PER_RUN = Number(process.env.BREAKING_MAX_CLASSIFICATIONS || 25);

/** Haiku tier: this runs 48x a day over many articles, so cost per call matters. */
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

/**
 * Phase 1 has no push transport: the app stores its Expo token only in
 * device-local AsyncStorage and no server-side registry exists yet, so there is
 * nobody to deliver to. Qualifying events are recorded as `pending_delivery`
 * and reported to Discord, which also gives a false-positive record to review
 * before real notifications ever fire. Flip this on once the token table ships.
 */
const PUSH_DELIVERY_ENABLED = process.env.BREAKING_PUSH_ENABLED === 'true';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const requiredEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
};

const missing = Object.entries(requiredEnv)
  .filter(([, value]) => !value || `${value}`.trim() === '')
  .map(([key]) => key);

if (missing.length) {
  console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(requiredEnv.SUPABASE_URL, requiredEnv.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: requiredEnv.ANTHROPIC_API_KEY });

const NEWSX_API_KEY = process.env.NEWSX_API_KEY;
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Surfaces run results on the GitHub Actions run page. No-op outside CI. */
const writeJobSummary = (markdown) => {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) return;
  try {
    fs.appendFileSync(target, `${markdown}\n`);
  } catch (err) {
    console.warn(`⚠️ Could not write job summary: ${err.message}`);
  }
};

/**
 * Low-noise Discord post, used only when something actually qualifies or gets
 * suppressed. Failure alerting lives in the workflow, matching the existing
 * pipeline. 'text' is Slack's field and 'content' is Discord's; each provider
 * ignores the other, so one secret works with either.
 */
async function postDiscordLog(message) {
  if (!ALERT_WEBHOOK_URL) {
    console.log('ℹ️ No ALERT_WEBHOOK_URL set; skipping Discord log.');
    return;
  }

  try {
    const response = await fetch(ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, content: message }),
    });

    if (!response.ok) {
      console.warn(`⚠️ Discord log rejected (HTTP ${response.status}).`);
    }
  } catch (err) {
    console.warn(`⚠️ Could not post Discord log: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Candidate sourcing (NewsX)
// ---------------------------------------------------------------------------

/**
 * Keywords that gate which articles are worth spending a classifier call on.
 * Deliberately broad — this is a cheap prefilter, and the LLM does the real
 * judging. Missing a breach here costs more than an extra Haiku call.
 */
const BREAKING_KEYWORD_RE =
  /\b(breach(?:ed|es)?|data leak|leaked|exfiltrat\w*|ransomware|extortion|hacked|hackers?|cyber ?attack|attack(?:ed|ing)?|intrusion|compromis(?:e|ed|ing)|zero[- ]day|0-day|exploit(?:ed|ing|s)?\b|actively exploited|in the wild|cve-\d{4}-\d+|critical (?:flaw|vulnerabilit\w*|bug)|outage|down(?:time)?|disrupt\w*|ddos|denial[- ]of[- ]service|offline|service restored|critical infrastructure|isp|takeover|stolen|hijack\w*)\b/i;

/**
 * Fetches candidate articles from NewsX.
 *
 * NOT YET IMPLEMENTED — the NewsX request/response contract is not documented
 * anywhere in this repo, and guessing field names would produce a pipeline that
 * silently returns nothing. Fill in the request and `normalizeNewsXItem` below
 * once the API docs are to hand.
 *
 * Must return an array of objects in this shape:
 *   {
 *     title:        string,
 *     summary:      string,        // description / snippet
 *     source:       string,        // publisher name
 *     source_url:   string,        // canonical article URL
 *     author:       string | null,
 *     image_url:    string | null,
 *     published_at: string,        // ISO 8601
 *     risk_signal:  string | null  // NewsX risk/sentiment field, if present.
 *                                  // Fed to the classifier as extra context
 *                                  // only — never used as the decision itself.
 *   }
 */
async function fetchNewsXCandidates() {
  if (!NEWSX_API_KEY) {
    console.log('ℹ️ NEWSX_API_KEY is not set — nothing to check. Exiting cleanly.');
    return null;
  }

  throw new Error(
    'NewsX adapter is not implemented yet. Add the request and normalizeNewsXItem() ' +
      'in breaking-news-check.mjs using the NewsX API docs, then remove this throw.',
  );
}

/** Keeps only articles published inside the recency window. */
function isRecent(article, now = Date.now()) {
  const published = new Date(article.published_at).getTime();
  if (Number.isNaN(published)) return false;

  const ageMinutes = (now - published) / 60_000;
  // Negative ages happen when a publisher post-dates a story; treat as fresh.
  return ageMinutes <= RECENCY_WINDOW_MINUTES;
}

// ---------------------------------------------------------------------------
// Severity classification
// ---------------------------------------------------------------------------

const CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    is_severe_breaking: {
      type: 'boolean',
      description: 'True only for a severe, just-happened event as defined by the rubric.',
    },
    category: {
      type: 'string',
      enum: ['breach', 'outage', 'active_attack', 'critical_vuln', 'other'],
      description: 'Event type, or "other" for anything that is not a severe live event.',
    },
    affected_entity: {
      type: 'string',
      description:
        'The single primary organisation, product or service affected, in canonical form ' +
        '(e.g. "Okta", "AT&T", "Fortinet FortiOS"). Use "unknown" if the article names none.',
    },
    confidence: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      description: 'Certainty that this meets the breaking bar. 5 = unambiguous.',
    },
    one_line_summary: {
      type: 'string',
      description:
        'One complete sentence, under 140 characters, usable verbatim as a push ' +
        'notification body. Plain language, no hype, ends with punctuation.',
    },
  },
  required: [
    'is_severe_breaking',
    'category',
    'affected_entity',
    'confidence',
    'one_line_summary',
  ],
  additionalProperties: false,
};

const CLASSIFIER_SYSTEM_PROMPT = `
You decide whether a cybersecurity news article describes a severe event that
just happened and warrants interrupting a phone user with a push notification.

You are deliberately conservative. A false alarm costs far more than a miss.

Qualify ONLY these, and only when the event is happening now or happened within
roughly the last 48 hours:

- "breach": a named organisation's data has been confirmed accessed, stolen,
  exposed or published. Not a hypothetical risk, not a study about breaches.
- "outage": a major service, ISP, cloud provider or piece of critical
  infrastructure is currently down or badly degraded for many users.
- "active_attack": a ransomware deployment, intrusion, DDoS or similar attack
  is underway or has just occurred against a named target.
- "critical_vuln": a severe vulnerability that is being actively exploited in
  the wild right now, or an emergency patch released in response to such
  exploitation.

Everything else is "other". In particular, "other" covers:
- analysis, commentary, opinion, editorials, predictions, "what we learned"
- research reports, surveys, statistics, threat-landscape roundups
- product launches, funding rounds, acquisitions, partnerships, awards
- security advice, how-tos, best-practice guides, listicles
- vulnerabilities disclosed with no evidence of exploitation
- retrospectives about incidents that happened weeks or months ago
- vendor marketing dressed up as news

Set is_severe_breaking true only when category is not "other" AND the event is
both severe and current.

Confidence rubric:
5 - explicit, unambiguous reporting of a live severe event at a named entity
4 - clearly reports such an event, minor uncertainty about scope or recency
3 - probably an event but the article is vague, second-hand or hedged
2 - reads more like analysis or a roundup than a live incident report
1 - clearly not a breaking event
`.trim();

async function classifyArticle(article) {
  const riskContext = article.risk_signal
    ? `\nProvider risk signal: ${article.risk_signal}` +
      `\n(Treat this as a weak hint only. Judge from the article text.)`
    : '';

  const prompt = `
Classify this article against the rubric.

Title: ${article.title}
Summary: ${article.summary || 'No summary available'}
Source: ${article.source || 'Unknown'}
Published: ${article.published_at}${riskContext}
`.trim();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    temperature: 0,
    system: CLASSIFIER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema: CLASSIFICATION_SCHEMA } },
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('model refused to classify this article');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('response truncated at max_tokens; JSON is incomplete');
  }

  const block = response.content.find((part) => part.type === 'text');
  if (!block) throw new Error('no text block in classifier response');

  return JSON.parse(block.text);
}

/** The push bar. Kept as one function so the threshold is easy to tune. */
function qualifies(verdict) {
  return (
    verdict.is_severe_breaking === true &&
    QUALIFYING_CATEGORIES.has(verdict.category) &&
    Number(verdict.confidence) >= MIN_CONFIDENCE
  );
}

// ---------------------------------------------------------------------------
// Dedup, cooldown and the daily cap
// ---------------------------------------------------------------------------

/**
 * Collapses an evolving story to one key. Entity is lowercased and stripped of
 * punctuation and corporate suffixes so "AT&T", "AT&T Inc." and "at&t" agree.
 */
function buildStoryKey(entity, category) {
  const normalized = String(entity || 'unknown')
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|plc|gmbh|co)\b\.?/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  return crypto.createHash('sha256').update(`${normalized}|${category}`).digest('hex').slice(0, 32);
}

async function loadEvent(storyKey) {
  const { data, error } = await supabase
    .from('breaking_events')
    .select('*')
    .eq('story_key', storyKey)
    .maybeSingle();

  if (error) throw new Error(`breaking_events lookup failed: ${error.message}`);
  return data;
}

function isInCooldown(event, now = Date.now()) {
  if (!event?.last_notified_at) return false;
  const elapsedHours = (now - new Date(event.last_notified_at).getTime()) / 3_600_000;
  return elapsedHours < COOLDOWN_HOURS;
}

/** Counts pushes already committed today (UTC), including pending deliveries. */
async function countPushesToday() {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('breaking_pushes')
    .select('id', { count: 'exact', head: true })
    .in('status', ['sent', 'pending_delivery'])
    .gte('decided_at', startOfDay.toISOString());

  if (error) throw new Error(`breaking_pushes count failed: ${error.message}`);
  return count ?? 0;
}

async function recordPushDecision({ storyKey, articleId, status, reason, body }) {
  const { error } = await supabase.from('breaking_pushes').insert({
    story_key: storyKey,
    article_id: articleId,
    status,
    reason,
    body,
  });

  if (error) console.error(`   ❌ Could not record push decision: ${error.message}`);
}

async function upsertEvent({ storyKey, entity, category, notified }) {
  const existing = await loadEvent(storyKey);
  const now = new Date().toISOString();

  if (!existing) {
    const { error } = await supabase.from('breaking_events').insert({
      story_key: storyKey,
      affected_entity: entity,
      category,
      first_seen_at: now,
      last_notified_at: notified ? now : null,
      notify_count: notified ? 1 : 0,
      updated_at: now,
    });
    if (error) throw new Error(`breaking_events insert failed: ${error.message}`);
    return;
  }

  const { error } = await supabase
    .from('breaking_events')
    .update({
      last_notified_at: notified ? now : existing.last_notified_at,
      notify_count: notified ? existing.notify_count + 1 : existing.notify_count,
      updated_at: now,
    })
    .eq('story_key', storyKey);

  if (error) throw new Error(`breaking_events update failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Priority write path
// ---------------------------------------------------------------------------

/**
 * Writes the article straight to the feed with its breaking flags, bypassing
 * the digest summarization queue entirely: `ai_summary_generated` is left false
 * so the nightly job can still enrich it later, but the feed does not wait for
 * that. `category` must stay inside articles_category_check's three values, so
 * the breaking kind lives in `breaking_category`.
 */
async function storeBreakingArticle(article, verdict) {
  const record = {
    title: article.title,
    summary: article.summary || verdict.one_line_summary,
    source: article.source,
    source_url: article.source_url,
    redirect_url: article.source_url,
    author: article.author || null,
    image_url: article.image_url || null,
    published_at: article.published_at,
    category: 'cybersecurity',
    ai_summary_generated: false,
    is_breaking: true,
    breaking_category: verdict.category,
    breaking_severity: verdict.confidence,
    breaking_tagged_at: new Date().toISOString(),
  };

  // The row may already exist from the digest pipeline, in which case the
  // breaking flags need to land on it rather than creating a duplicate.
  const { data, error } = await supabase
    .from('articles')
    .upsert(record, { onConflict: 'source_url' })
    .select('id')
    .maybeSingle();

  if (error) throw new Error(`article upsert failed: ${error.message}`);
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🚨 Breaking-news check starting...');
  console.log(
    `   window=${RECENCY_WINDOW_MINUTES}m confidence>=${MIN_CONFIDENCE} ` +
      `cooldown=${COOLDOWN_HOURS}h cap=${MAX_PUSHES_PER_DAY}/day model=${MODEL}`,
  );

  const candidates = await fetchNewsXCandidates();

  if (candidates === null) {
    writeJobSummary('### 🚨 Breaking news\n\nNEWSX_API_KEY not configured — no check performed.');
    return;
  }

  const now = Date.now();
  const recent = candidates.filter((article) => isRecent(article, now));
  const keyworded = recent.filter((article) =>
    BREAKING_KEYWORD_RE.test(`${article.title} ${article.summary || ''}`),
  );
  const toClassify = keyworded.slice(0, MAX_CLASSIFICATIONS_PER_RUN);

  console.log(
    `📊 ${candidates.length} fetched -> ${recent.length} recent -> ` +
      `${keyworded.length} keyword hits -> ${toClassify.length} classified`,
  );

  const pushed = [];
  const suppressed = [];
  let classifyErrors = 0;

  for (const article of toClassify) {
    let verdict;
    try {
      verdict = await classifyArticle(article);
    } catch (err) {
      classifyErrors++;
      console.error(`   ❌ Classification failed for "${article.title}": ${err.message}`);
      continue;
    } finally {
      // Throttle every call, not just the ones that qualify — a busy window can
      // send 25 articles through here back to back.
      await wait(400);
    }

    console.log(
      `   • ${verdict.category}/${verdict.confidence} ${verdict.affected_entity} — ${article.title.slice(0, 70)}`,
    );

    if (!qualifies(verdict)) continue;

    const storyKey = buildStoryKey(verdict.affected_entity, verdict.category);
    const event = await loadEvent(storyKey);

    // The article is written either way: a story already notified still belongs
    // in the feed, it just must not notify a second time.
    let articleId = null;
    try {
      articleId = await storeBreakingArticle(article, verdict);
    } catch (err) {
      console.error(`   ❌ Could not store breaking article: ${err.message}`);
      continue;
    }

    if (isInCooldown(event, now)) {
      const reason = `same entity+category notified within ${COOLDOWN_HOURS}h`;
      console.log(`   ⏸️ Cooldown: ${verdict.affected_entity} (${verdict.category})`);
      suppressed.push({ verdict, article, reason });
      await upsertEvent({
        storyKey,
        entity: verdict.affected_entity,
        category: verdict.category,
        notified: false,
      });
      await recordPushDecision({
        storyKey,
        articleId,
        status: 'suppressed_cooldown',
        reason,
        body: verdict.one_line_summary,
      });
      continue;
    }

    const todayCount = await countPushesToday();
    if (todayCount >= MAX_PUSHES_PER_DAY) {
      const reason = `daily cap of ${MAX_PUSHES_PER_DAY} already reached (${todayCount})`;
      console.log(`   🛑 Capped: ${verdict.affected_entity} (${verdict.category})`);
      suppressed.push({ verdict, article, reason });
      await upsertEvent({
        storyKey,
        entity: verdict.affected_entity,
        category: verdict.category,
        notified: false,
      });
      await recordPushDecision({
        storyKey,
        articleId,
        status: 'suppressed_daily_cap',
        reason,
        body: verdict.one_line_summary,
      });
      continue;
    }

    // Qualified and allowed. Phase 2 sends the Expo push here; until a token
    // registry exists the decision is recorded so nothing is lost.
    const status = PUSH_DELIVERY_ENABLED ? 'sent' : 'pending_delivery';

    await upsertEvent({
      storyKey,
      entity: verdict.affected_entity,
      category: verdict.category,
      notified: true,
    });
    await recordPushDecision({
      storyKey,
      articleId,
      status,
      reason: PUSH_DELIVERY_ENABLED ? null : 'no push transport configured yet',
      body: verdict.one_line_summary,
    });

    pushed.push({ verdict, article, articleId });
    console.log(`   ✅ Breaking: ${verdict.affected_entity} — ${verdict.one_line_summary}`);
  }

  // --- Reporting -----------------------------------------------------------

  const summaryLines = [
    '### 🚨 Breaking news check',
    '',
    `| Stage | Count |`,
    `| --- | --- |`,
    `| Fetched | ${candidates.length} |`,
    `| Within ${RECENCY_WINDOW_MINUTES}m | ${recent.length} |`,
    `| Keyword hits | ${keyworded.length} |`,
    `| Classified | ${toClassify.length} |`,
    `| Qualified | ${pushed.length} |`,
    `| Suppressed | ${suppressed.length} |`,
    `| Classifier errors | ${classifyErrors} |`,
  ];
  writeJobSummary(summaryLines.join('\n'));

  if (pushed.length > 0) {
    const lines = pushed.map(
      (entry) =>
        `• **${entry.verdict.category}** · ${entry.verdict.affected_entity} ` +
        `(confidence ${entry.verdict.confidence})\n  ${entry.verdict.one_line_summary}\n  ${entry.article.source_url}`,
    );
    const verb = PUSH_DELIVERY_ENABLED ? 'Pushed' : 'Would push (no transport yet)';
    await postDiscordLog(`🚨 CyberSimply breaking — ${verb}:\n${lines.join('\n')}`);
  }

  if (suppressed.length > 0) {
    const lines = suppressed.map(
      (entry) => `• ${entry.verdict.affected_entity} (${entry.verdict.category}) — ${entry.reason}`,
    );
    await postDiscordLog(`🔕 CyberSimply breaking — suppressed:\n${lines.join('\n')}`);
  }

  // A classifier that fails on everything is broken, not unlucky.
  if (toClassify.length > 0 && classifyErrors === toClassify.length) {
    throw new Error(`all ${classifyErrors} classification calls failed`);
  }

  console.log(`✅ Done. ${pushed.length} qualified, ${suppressed.length} suppressed.`);
}

main().catch((err) => {
  console.error(`❌ Breaking-news check failed: ${err.message}`);
  writeJobSummary(`### ❌ Breaking news check failed\n\n\`${err.message}\``);
  process.exit(1);
});
