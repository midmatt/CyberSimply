-- Breaking-news RSS migration.
-- Run this in the Supabase SQL editor AFTER breaking-news-schema.sql and
-- BEFORE the first (seed) run of breaking-news-check.yml.
-- Safe to re-run: every statement is guarded.
--
-- Replaces NewsX single-source polling with five RSS feeds. Two changes:
--   1. `articles.source_feed` records which feed carried the story.
--   2. `processed_feed_entries` replaces the pubDate recency window.

-- =============================================
-- 1. SOURCE FEED ON ARTICLES
-- =============================================

-- `source` already holds the publisher name. `source_feed` is the feed the
-- entry actually arrived on, which is what corroboration counts and what the
-- Discord log reports. They usually agree; keeping them apart means a feed
-- rename does not rewrite publisher attribution on old rows.
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS source_feed TEXT;

-- =============================================
-- 2. FIRST-SEEN TRACKING
-- =============================================

-- Recency is "this entry was not in the feed last time we looked", not
-- "pubDate is within N minutes". Publishers stamp feeds inconsistently — CISA
-- dates every advisory 12:00:00 UTC with day-level granularity, so a 45-minute
-- pubDate window missed it on 47 of 48 daily runs — and first sighting is the
-- signal that actually matters.
--
-- This table doubles as the corroboration lookback: a title seen on another
-- feed in the last few hours is what makes a story corroborated, and the two
-- windows are deliberately independent.
CREATE TABLE IF NOT EXISTS processed_feed_entries (
  entry_key     TEXT PRIMARY KEY,        -- sha256(feed_name | guid or link)
  feed_name     TEXT NOT NULL,
  entry_guid    TEXT,                    -- null when the feed omits <guid>
  link          TEXT,
  title         TEXT NOT NULL,           -- kept for corroboration matching
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The only query shapes are "are these keys known" (primary key) and "what did
-- we see in the last few hours" (this index).
CREATE INDEX IF NOT EXISTS processed_feed_entries_first_seen_idx
  ON processed_feed_entries (first_seen_at DESC);

-- =============================================
-- 3. ROW LEVEL SECURITY
-- =============================================

-- Not read by the app; only the workflow's service-role key touches it, and
-- that bypasses RLS. Enabling RLS with no policy denies anon/authenticated
-- access by default, matching breaking_events and breaking_pushes.
ALTER TABLE processed_feed_entries ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. AFTER RUNNING THIS
-- =============================================
--
-- Run the workflow ONCE in seed mode before enabling the cron schedule:
--
--   Actions -> Breaking News Check -> Run workflow -> seed_only: true
--
-- That records every entry currently in all five feeds as already-seen without
-- classifying or pushing any of them. Skipping it means CISA's 30-advisory
-- backlog and ~125 other existing entries all look brand new on the first real
-- run and fire false breaking pushes.
