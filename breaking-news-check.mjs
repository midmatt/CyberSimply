// breaking-news-check.mjs
//
// Detects severe, just-happened cybersecurity events and flags them as breaking.
// Runs every 30 minutes, completely separate from the daily digest pipeline in
// fetch-articles.mjs / summarize-articles.mjs — it shares nothing but the
// `articles` table and never touches the summarization queue.
//
// Pipeline: fetch all 5 RSS feeds -> first-seen diff -> keyword prefilter ->
// Readability body fallback -> cross-feed corroboration -> Claude severity
// classification -> dedup/cooldown -> daily cap -> write article + record the
// push decision.
//
// Run with: node breaking-news-check.mjs
// Seed once before enabling cron: BREAKING_SEED_ONLY=true node breaking-news-check.mjs

import fs from 'node:fs';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

// ---------------------------------------------------------------------------
// Tuning constants. These are the knobs worth changing after watching a few
// days of Discord logs; everything else is mechanism.
// ---------------------------------------------------------------------------

/**
 * Recency is tracked by first-sighting, not by pubDate. Publishers stamp their
 * feeds inconsistently — CISA dates every advisory 12:00:00 UTC with day-level
 * granularity, so a pubDate window would have missed it on 47 of 48 daily runs
 * — and an entry appearing in a feed for the first time is the signal we
 * actually care about. Anything already in `processed_feed_entries` is old news.
 */
const ENTRY_RETENTION_DAYS = Number(process.env.BREAKING_ENTRY_RETENTION_DAYS || 30);

/**
 * Hard floor behind the first-seen diff, not a replacement for it. Since
 * recency is judged by first sighting, an entry that has never been seen looks
 * new however old it is — a rewritten guid, a re-listed item or a skipped seed
 * run would otherwise put a months-old post in front of the classifier and
 * leave its "within roughly the last 48 hours" rubric as the only thing
 * standing between that and a push. Feeds carry entries well past this: Krebs
 * spanned 57 days in testing, Dark Reading 13, CISA 14.
 */
const MAX_ENTRY_AGE_DAYS = Number(process.env.BREAKING_MAX_ENTRY_AGE_DAYS || 7);

/**
 * Seed mode: record every entry currently in all five feeds as already-seen
 * without classifying or pushing any of them. Must be run once before the cron
 * schedule takes over, otherwise CISA's 30-advisory backlog (and every other
 * feed's existing entries) all look brand new and fire false pushes.
 */
const SEED_ONLY = process.env.BREAKING_SEED_ONLY === 'true';

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

// --- Feed sourcing ---------------------------------------------------------

const FEEDS = [
  { name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/' },
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews' },
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/' },
  { name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml' },
  { name: 'CISA Advisories', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml' },
];

/** BleepingComputer 403s requests with no User-Agent, and it is rude anyway. */
const USER_AGENT =
  process.env.BREAKING_USER_AGENT ||
  'Mozilla/5.0 (compatible; CyberSimplyBot/1.0; +https://cybersimply.app)';

const FEED_TIMEOUT_MS = Number(process.env.BREAKING_FEED_TIMEOUT_MS || 15_000);
const ARTICLE_TIMEOUT_MS = Number(process.env.BREAKING_ARTICLE_TIMEOUT_MS || 12_000);

/**
 * Below this many words the feed teaser is too thin to classify on, so the
 * article body is fetched. Measured against the live feeds: Krebs and CISA
 * never trip this, The Hacker News sits just above it (~59 words median), and
 * BleepingComputer (~26) and Dark Reading (~21) trip it on essentially every
 * entry. The fallback is therefore the common path, not a rare one.
 */
const MIN_TEASER_WORDS = Number(process.env.BREAKING_MIN_TEASER_WORDS || 40);

/**
 * Ceiling on the text handed to the classifier. CISA puts entire advisories in
 * <description> (up to 9,108 words in testing) and Krebs puts whole posts in
 * content:encoded; unbounded, either would dominate the token bill.
 */
const CLASSIFIER_TEXT_MAX_WORDS = Number(process.env.BREAKING_CLASSIFIER_WORDS || 180);

/** What lands in articles.summary — feed-card length, not advisory length. */
const STORED_SUMMARY_MAX_WORDS = Number(process.env.BREAKING_SUMMARY_WORDS || 80);

/**
 * How far back corroboration looks. Deliberately decoupled from the first-seen
 * diff: the feeds run hours apart (Dark Reading trailed BleepingComputer by
 * ~22h in testing), so two outlets covering one event are rarely in the same
 * run. Four hours lets the later one still corroborate the earlier.
 */
const CORROBORATION_LOOKBACK_HOURS = Number(process.env.BREAKING_CORROBORATION_HOURS || 4);

/** Share of the shorter title's significant tokens that must match. */
const CORROBORATION_MIN_OVERLAP = Number(process.env.BREAKING_CORROBORATION_OVERLAP || 0.5);

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
// Candidate sourcing (RSS)
// ---------------------------------------------------------------------------

/**
 * `description` lands on `content`; `content:encoded` needs declaring. Dark
 * Reading is the only feed carrying images, and it uses media:* rather than
 * <enclosure>, which The Hacker News uses.
 */
const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
    ],
  },
});

const stripHtml = (html) =>
  String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

const wordCount = (text) => (text ? text.split(/\s+/).filter(Boolean).length : 0);

const truncateWords = (text, max) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  return words.length <= max ? String(text || '').trim() : `${words.slice(0, max).join(' ')}…`;
};

/** Feed links carry campaign junk; the same story must not key two rows. */
function cleanUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ocid'].forEach((k) =>
      parsed.searchParams.delete(k),
    );
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Stable identity for one feed entry. Namespaced by feed because CISA's guids
 * are site-relative ("/node/25214") and would otherwise be free to collide
 * with another publisher's.
 */
function buildEntryKey(feedName, rawId) {
  return crypto.createHash('sha256').update(`${feedName}|${rawId}`).digest('hex').slice(0, 40);
}

function pickImage(item) {
  const media = Array.isArray(item.mediaContent) ? item.mediaContent[0] : item.mediaContent;
  const thumb = Array.isArray(item.mediaThumbnail) ? item.mediaThumbnail[0] : item.mediaThumbnail;
  const candidates = [item.enclosure?.url, media?.$?.url, thumb?.$?.url];
  return candidates.find((url) => typeof url === 'string' && /^https?:\/\//i.test(url)) || null;
}

function normalizeEntry(item, feed) {
  const sourceUrl = cleanUrl(item.link);
  const title = stripHtml(item.title);
  if (!sourceUrl || !title) return null;

  const guid = typeof item.guid === 'string' ? item.guid : (item.guid?._ ?? null);

  return {
    entry_key: buildEntryKey(feed.name, guid || sourceUrl),
    entry_guid: guid,
    title,
    // content:encoded when the publisher provides it (Krebs), else description.
    text: stripHtml(item.contentEncoded || item.content || ''),
    text_source: item.contentEncoded ? 'content:encoded' : 'description',
    source: feed.name,
    source_feed: feed.name,
    source_url: sourceUrl,
    author: item.creator?.trim() || item.author?.trim() || null,
    image_url: pickImage(item),
    // isoDate is rss-parser's normalized pubDate; it parsed correctly on all
    // five feeds, including CISA's two-digit year. Recorded for display only —
    // nothing gates on it any more.
    published_at: item.isoDate || new Date().toISOString(),
  };
}

/**
 * One feed. Throws on any failure; the caller decides that a dead feed is not
 * a dead run. Uses global fetch rather than parser.parseURL so the User-Agent,
 * timeout and redirect behaviour are all explicit.
 */
async function fetchFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

  try {
    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

    const parsed = await parser.parseString(await response.text());
    return (parsed.items || []).map((item) => normalizeEntry(item, feed)).filter(Boolean);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * All five feeds. A timeout, a 403 or malformed XML costs that feed's entries
 * for this run and nothing more — the other four still get checked.
 */
async function fetchAllFeeds() {
  const results = await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        const entries = await fetchFeed(feed);
        console.log(`   ✓ ${feed.name}: ${entries.length} entries`);
        return { feed, entries, error: null };
      } catch (err) {
        const message = err.name === 'AbortError' ? `timed out after ${FEED_TIMEOUT_MS}ms` : err.message;
        console.warn(`   ⚠️ ${feed.name}: skipped (${message})`);
        return { feed, entries: [], error: message };
      }
    }),
  );

  // One entry_key can only appear once, even if a feed repeats it.
  const seen = new Set();
  const entries = [];
  for (const result of results) {
    for (const entry of result.entries) {
      if (seen.has(entry.entry_key)) continue;
      seen.add(entry.entry_key);
      entries.push(entry);
    }
  }

  return {
    entries,
    failures: results.filter((r) => r.error).map((r) => ({ name: r.feed.name, error: r.error })),
    perFeed: results.map((r) => ({ name: r.feed.name, count: r.entries.length })),
  };
}

/**
 * Readability fallback for the thin feeds. Only called for entries that already
 * survived the first-seen diff and the keyword prefilter, so a busy run fetches
 * a handful of URLs rather than all ~155 entries.
 *
 * JSDOM is constructed without runScripts and without a resource loader, so the
 * remote page's own JavaScript never executes.
 */
async function fetchArticleBody(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ARTICLE_TIMEOUT_MS);

  let dom;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

    dom = new JSDOM(await response.text(), { url });
    const parsed = new Readability(dom.window.document).parse();
    return stripHtml(parsed?.textContent || parsed?.content || '');
  } finally {
    clearTimeout(timer);
    // JSDOM leaks timers and the run is long-lived across many entries.
    dom?.window?.close();
  }
}

/**
 * Fills in body text for entries whose teaser is too thin to judge. Every fetch
 * is individually guarded: a slow or dead article leaves that entry with its
 * teaser and the run carries on.
 */
async function enrichThinEntries(entries) {
  let attempted = 0;
  let succeeded = 0;
  // Tallied per feed rather than logged per entry: Dark Reading blocks article
  // fetches at its CDN for every non-browser client, so a per-entry warning
  // would put ~23 identical lines in every one of the 48 daily runs. The feed
  // teaser is what the classifier judges those on.
  const failuresByFeed = new Map();

  for (const entry of entries) {
    if (wordCount(entry.text) >= MIN_TEASER_WORDS) continue;

    attempted++;
    try {
      const body = await fetchArticleBody(entry.source_url);
      if (wordCount(body) > wordCount(entry.text)) {
        entry.text = body;
        entry.text_source = 'readability';
        succeeded++;
      }
    } catch (err) {
      const message = err.name === 'AbortError' ? `timed out after ${ARTICLE_TIMEOUT_MS}ms` : err.message;
      const bucket = failuresByFeed.get(entry.source_feed) ?? { count: 0, lastError: '' };
      failuresByFeed.set(entry.source_feed, { count: bucket.count + 1, lastError: message });
    }
  }

  if (attempted > 0) {
    const failed = [...failuresByFeed.entries()]
      .map(([feed, { count, lastError }]) => `${feed} ${count} (${lastError})`)
      .join(', ');
    console.log(
      `   📄 Readability: ${succeeded}/${attempted} bodies recovered` +
        (failed ? ` — failed: ${failed}` : ''),
    );
  }

  return { attempted, succeeded, failuresByFeed };
}

/**
 * The age backstop. An entry with no usable pubDate counts as fresh:
 * normalizeEntry already falls back to "now" when a feed omits the date, and
 * silently dropping undated entries would lose real breaking news. Post-dated
 * entries — publishers do this — are fresh too.
 */
function withinMaxAge(entry, now = Date.now()) {
  const published = new Date(entry.published_at).getTime();
  if (Number.isNaN(published)) return true;
  return (now - published) / 86_400_000 <= MAX_ENTRY_AGE_DAYS;
}

// ---------------------------------------------------------------------------
// First-seen tracking
// ---------------------------------------------------------------------------

/** PostgREST puts .in() lists in the URL, so long key lists go in batches. */
async function loadKnownKeys(keys) {
  const known = new Set();

  for (let i = 0; i < keys.length; i += 100) {
    const batch = keys.slice(i, i + 100);
    const { data, error } = await supabase
      .from('processed_feed_entries')
      .select('entry_key')
      .in('entry_key', batch);

    if (error) throw new Error(`processed_feed_entries lookup failed: ${error.message}`);
    for (const row of data ?? []) known.add(row.entry_key);
  }

  return known;
}

async function markSeen(entries) {
  if (entries.length === 0) return;

  for (let i = 0; i < entries.length; i += 500) {
    const rows = entries.slice(i, i + 500).map((entry) => ({
      entry_key: entry.entry_key,
      feed_name: entry.source_feed,
      entry_guid: entry.entry_guid,
      link: entry.source_url,
      title: entry.title,
    }));

    const { error } = await supabase
      .from('processed_feed_entries')
      .upsert(rows, { onConflict: 'entry_key', ignoreDuplicates: true });

    // Not fatal: an unrecorded entry is reprocessed next run, and the
    // cooldown in breaking_events is what actually stops a double push.
    if (error) console.error(`   ❌ Could not record seen entries: ${error.message}`);
  }
}

async function pruneOldEntries() {
  const cutoff = new Date(Date.now() - ENTRY_RETENTION_DAYS * 86_400_000).toISOString();
  const { error } = await supabase.from('processed_feed_entries').delete().lt('first_seen_at', cutoff);
  if (error) console.warn(`⚠️ Could not prune processed_feed_entries: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Cross-feed corroboration
// ---------------------------------------------------------------------------

/**
 * Two outlets covering one event share the nouns that matter and little else,
 * so significant-token overlap is enough here. This is a confidence hint for
 * the classifier, not a gate — a false negative costs nothing.
 */
const TITLE_STOPWORDS = new Set(
  ('the a an and or but for with from into over after before new news says say said report reports ' +
    'how why what when who are was were has have had its their this that these those more than out ' +
    'via amid you your can could may might will would about against across under using use used now ' +
    'still also been being not all one two three following amid says').split(' '),
);

const CVE_RE = /cve-\d{4}-\d{4,7}/gi;

function titleTokens(title) {
  return new Set(
    String(title || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s.-]/g, ' ')
      .split(/\s+/)
      .map((token) => token.replace(/^[.-]+|[.-]+$/g, ''))
      .filter((token) => token.length > 2 && !TITLE_STOPWORDS.has(token)),
  );
}

function cveSet(text) {
  return new Set((String(text || '').match(CVE_RE) || []).map((cve) => cve.toLowerCase()));
}

function isSameStory(a, b) {
  // A shared CVE id is decisive; nothing else needs to match.
  for (const cve of a.cves) if (b.cves.has(cve)) return true;

  const shared = [...a.tokens].filter((token) => b.tokens.has(token));
  // One shared token is a coincidence ("Microsoft"), two is a story.
  if (shared.length < 2) return false;

  const smaller = Math.min(a.tokens.size, b.tokens.size);
  return smaller > 0 && shared.length / smaller >= CORROBORATION_MIN_OVERLAP;
}

/**
 * Everything worth comparing against: entries from this run plus every entry
 * first seen in the lookback window. Rows recalled from the table have only
 * their title, so cross-run CVE matching is title-only — enough for the
 * "CVE-2026-1234 exploited" headlines that carry the id up front.
 */
async function buildCorroborationPool(runEntries) {
  const since = new Date(Date.now() - CORROBORATION_LOOKBACK_HOURS * 3_600_000).toISOString();

  const { data, error } = await supabase
    .from('processed_feed_entries')
    .select('entry_key, feed_name, title')
    .gte('first_seen_at', since);

  if (error) throw new Error(`corroboration lookup failed: ${error.message}`);

  const pool = runEntries.map((entry) => ({
    entry_key: entry.entry_key,
    feed_name: entry.source_feed,
    tokens: titleTokens(entry.title),
    cves: cveSet(`${entry.title} ${entry.text}`),
  }));

  const inRun = new Set(runEntries.map((entry) => entry.entry_key));
  for (const row of data ?? []) {
    if (inRun.has(row.entry_key)) continue;
    pool.push({
      entry_key: row.entry_key,
      feed_name: row.feed_name,
      tokens: titleTokens(row.title),
      cves: cveSet(row.title),
    });
  }

  return pool;
}

/** Only a *different* feed corroborates; one outlet repeating itself does not. */
function findCorroboration(entry, pool) {
  const self = { tokens: titleTokens(entry.title), cves: cveSet(`${entry.title} ${entry.text}`) };
  const feeds = new Set();

  for (const other of pool) {
    if (other.entry_key === entry.entry_key) continue;
    if (other.feed_name === entry.source_feed) continue;
    if (isSameStory(self, other)) feeds.add(other.feed_name);
  }

  return { corroborated: feeds.size > 0, corroborating_feeds: [...feeds] };
}

/**
 * Keywords that gate which articles are worth spending a classifier call on.
 * Deliberately broad — this is a cheap prefilter, and the LLM does the real
 * judging. Missing a breach here costs more than an extra Haiku call.
 */
const BREAKING_KEYWORD_RE =
  /\b(breach(?:ed|es)?|data leak|leaked|exfiltrat\w*|ransomware|extortion|hacked|hackers?|cyber ?attack|attack(?:ed|ing)?|intrusion|compromis(?:e|ed|ing)|zero[- ]day|0-day|exploit(?:ed|ing|s)?\b|actively exploited|in the wild|cve-\d{4}-\d+|critical (?:flaw|vulnerabilit\w*|bug)|outage|down(?:time)?|disrupt\w*|ddos|denial[- ]of[- ]service|offline|service restored|critical infrastructure|isp|takeover|stolen|hijack\w*)\b/i;

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
  // Corroboration is a confidence hint, never a requirement: a genuine scoop
  // breaks in one outlet first, and a story every outlet is covering may still
  // be analysis. Absence of corroboration is left unsaid rather than argued
  // against, so a single-source scoop is not pushed downward.
  const corroborationContext = article.corroborated
    ? `\nCorroboration: independently covered by ${article.corroborating_feeds.join(', ')} ` +
      `within the last ${CORROBORATION_LOOKBACK_HOURS}h.` +
      `\n(A mild confidence booster only. It is not evidence of severity or recency — ` +
      `a widely-covered analysis piece is still "other".)`
    : '';

  const prompt = `
Classify this article against the rubric.

Title: ${article.title}
Summary: ${truncateWords(article.text, CLASSIFIER_TEXT_MAX_WORDS) || 'No summary available'}
Source: ${article.source || 'Unknown'}
Published: ${article.published_at}${corroborationContext}
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
    // Feed-card length. The raw text can be a whole CISA advisory, which is
    // classifier input, not something to render in a card.
    summary: truncateWords(article.text, STORED_SUMMARY_MAX_WORDS) || verdict.one_line_summary,
    source: article.source,
    source_feed: article.source_feed,
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
    `   confidence>=${MIN_CONFIDENCE} cooldown=${COOLDOWN_HOURS}h ` +
      `cap=${MAX_PUSHES_PER_DAY}/day corroboration=${CORROBORATION_LOOKBACK_HOURS}h model=${MODEL}`,
  );

  const { entries, failures, perFeed } = await fetchAllFeeds();

  // Every feed failing is an outage, not an empty news cycle.
  if (entries.length === 0) {
    if (failures.length === FEEDS.length) {
      throw new Error(`all ${FEEDS.length} feeds failed: ${failures.map((f) => `${f.name} (${f.error})`).join('; ')}`);
    }
    console.log('ℹ️ No entries returned by any feed.');
    writeJobSummary('### 🚨 Breaking news check\n\nNo entries returned.');
    return;
  }

  const known = await loadKnownKeys(entries.map((entry) => entry.entry_key));
  const unseen = entries.filter((entry) => !known.has(entry.entry_key));

  // --- Seed mode -----------------------------------------------------------

  if (SEED_ONLY) {
    // Seeds everything fetched, including entries past the age floor, so a
    // later change to that floor cannot resurface today's backlog.
    await markSeen(entries);
    const message =
      `Seeded ${entries.length} entries (${unseen.length} newly recorded) across ` +
      `${perFeed.length} feeds. Nothing classified, nothing pushed.`;
    console.log(`🌱 ${message}`);
    writeJobSummary(
      `### 🌱 Breaking news seed run\n\n${message}\n\n` +
        `The cron schedule can now be enabled; only entries appearing *after* this point are treated as new.`,
    );
    return;
  }

  // The age floor is applied on top of the first-seen diff, not instead of it:
  // an entry must be both unseen and recent to reach the classifier.
  const fresh = [];
  const stale = [];
  for (const entry of unseen) (withinMaxAge(entry) ? fresh : stale).push(entry);

  const keyworded = [];
  const skipped = [];
  for (const entry of fresh) {
    // The prefilter runs on the teaser, before the body fallback, so a thin
    // feed is judged on its headline here. Breaking headlines carry the
    // keyword ("...flaw exploited to crash..."); this trades a rare miss for
    // not fetching ~50 Dark Reading article bodies every half hour.
    (BREAKING_KEYWORD_RE.test(`${entry.title} ${entry.text}`) ? keyworded : skipped).push(entry);
  }

  const toClassify = keyworded.slice(0, MAX_CLASSIFICATIONS_PER_RUN);
  // Anything over the cap stays unrecorded so the next run picks it up.
  const deferred = keyworded.length - toClassify.length;

  console.log(
    `📊 ${entries.length} fetched -> ${unseen.length} unseen -> ${fresh.length} within ` +
      `${MAX_ENTRY_AGE_DAYS}d -> ${keyworded.length} keyword hits -> ${toClassify.length} classified` +
      (deferred > 0 ? ` (${deferred} deferred to next run)` : ''),
  );
  if (stale.length > 0) {
    console.log(`   ⏳ ${stale.length} unseen entries older than ${MAX_ENTRY_AGE_DAYS}d, skipped`);
  }

  const readability = await enrichThinEntries(toClassify);

  // A week-old post covering the same entity is not corroboration of a live
  // event, so the pool is held to the same age floor as the candidates.
  const pool = await buildCorroborationPool(entries.filter((entry) => withinMaxAge(entry)));
  for (const entry of toClassify) Object.assign(entry, findCorroboration(entry, pool));
  const corroboratedCount = toClassify.filter((entry) => entry.corroborated).length;
  if (corroboratedCount > 0) console.log(`   🔗 ${corroboratedCount} corroborated across feeds`);

  const now = Date.now();
  const pushed = [];
  const suppressed = [];
  let classifyErrors = 0;

  // Entries that never reach the classifier are settled now; classified ones
  // are added as they finish, so a crash mid-loop does not replay the work
  // already paid for. A failed classification is deliberately left unrecorded
  // so a transient API error gets retried next run. Stale entries are recorded
  // too — they have been judged, and re-judging them every 30 minutes for as
  // long as they sit in the feed is pure waste.
  const processed = [...skipped, ...stale];

  try {
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

      if (!qualifies(verdict)) {
        processed.push(article);
        continue;
      }

      const storyKey = buildStoryKey(verdict.affected_entity, verdict.category);
      const event = await loadEvent(storyKey);

      // The article is written either way: a story already notified still belongs
      // in the feed, it just must not notify a second time.
      let articleId = null;
      try {
        articleId = await storeBreakingArticle(article, verdict);
      } catch (err) {
        // Left unrecorded on purpose so the next run retries the write.
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
        processed.push(article);
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
        processed.push(article);
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
      processed.push(article);
      console.log(`   ✅ Breaking: ${verdict.affected_entity} — ${verdict.one_line_summary}`);
    }
  } finally {
    // Runs even if the loop threw, so work already paid for is not repeated.
    await markSeen(processed);
    await pruneOldEntries();
  }

  // --- Reporting -----------------------------------------------------------

  const summaryLines = [
    '### 🚨 Breaking news check',
    '',
    `| Stage | Count |`,
    `| --- | --- |`,
    `| Fetched | ${entries.length} |`,
    `| Unseen | ${unseen.length} |`,
    `| Within ${MAX_ENTRY_AGE_DAYS}d | ${fresh.length} |`,
    `| Keyword hits | ${keyworded.length} |`,
    `| Classified | ${toClassify.length} |`,
    `| Corroborated | ${corroboratedCount} |`,
    `| Readability fallbacks | ${readability.succeeded}/${readability.attempted} |`,
    `| Qualified | ${pushed.length} |`,
    `| Suppressed | ${suppressed.length} |`,
    `| Classifier errors | ${classifyErrors} |`,
    '',
    `Per feed: ${perFeed.map((f) => `${f.name} ${f.count}`).join(' · ')}`,
  ];
  if (failures.length > 0) {
    summaryLines.push('', `⚠️ Feeds skipped: ${failures.map((f) => `${f.name} (${f.error})`).join('; ')}`);
  }
  writeJobSummary(summaryLines.join('\n'));

  /** Which feed carried the story, and who else was reporting it. */
  const provenance = (article) =>
    article.corroborated
      ? `${article.source_feed} · corroborated by ${article.corroborating_feeds.join(', ')}`
      : `${article.source_feed} · single-source`;

  if (pushed.length > 0) {
    const lines = pushed.map(
      (entry) =>
        `• **${entry.verdict.category}** · ${entry.verdict.affected_entity} ` +
        `(confidence ${entry.verdict.confidence})\n  ${entry.verdict.one_line_summary}\n` +
        `  ${provenance(entry.article)}\n  ${entry.article.source_url}`,
    );
    const verb = PUSH_DELIVERY_ENABLED ? 'Pushed' : 'Would push (no transport yet)';
    await postDiscordLog(`🚨 CyberSimply breaking — ${verb}:\n${lines.join('\n')}`);
  }

  if (suppressed.length > 0) {
    const lines = suppressed.map(
      (entry) =>
        `• ${entry.verdict.affected_entity} (${entry.verdict.category}) — ${entry.reason}\n` +
        `  ${provenance(entry.article)}`,
    );
    await postDiscordLog(`🔕 CyberSimply breaking — suppressed:\n${lines.join('\n')}`);
  }

  // A feed that keeps failing is silent data loss; surface it even on a green run.
  if (failures.length > 0) {
    await postDiscordLog(
      `⚠️ CyberSimply breaking — feeds skipped this run:\n${failures
        .map((f) => `• ${f.name}: ${f.error}`)
        .join('\n')}`,
    );
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
