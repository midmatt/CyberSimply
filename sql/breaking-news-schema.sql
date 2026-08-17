-- Breaking-news detection schema.
-- Run this in the Supabase SQL editor before enabling breaking-news-check.yml.
-- Safe to re-run: every statement is guarded.
--
-- Column names below were taken from the live `articles` table, which has:
--   id, title, summary, content, source_url, source, author, published_at,
--   image_url, category, what, impact, takeaways, why_this_matters,
--   ai_summary_generated, created_at, updated_at, redirect_url

-- =============================================
-- 1. BREAKING FLAGS ON ARTICLES
-- =============================================

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS is_breaking BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS breaking_category TEXT,
  ADD COLUMN IF NOT EXISTS breaking_severity SMALLINT,
  ADD COLUMN IF NOT EXISTS breaking_tagged_at TIMESTAMPTZ;

-- The existing `category` column is pinned by articles_category_check to
-- ('cybersecurity','hacking','general'), so the breaking kind needs its own
-- column rather than overloading that one.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'articles_breaking_category_check'
  ) THEN
    ALTER TABLE articles ADD CONSTRAINT articles_breaking_category_check
      CHECK (
        breaking_category IS NULL
        OR breaking_category IN ('breach', 'outage', 'active_attack', 'critical_vuln')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'articles_breaking_severity_check'
  ) THEN
    ALTER TABLE articles ADD CONSTRAINT articles_breaking_severity_check
      CHECK (breaking_severity IS NULL OR breaking_severity BETWEEN 1 AND 5);
  END IF;
END $$;

-- The feed pins breaking stories to the top for a few hours, so the only query
-- that matters is "recent breaking rows". A partial index keeps this tiny.
CREATE INDEX IF NOT EXISTS articles_breaking_recent_idx
  ON articles (breaking_tagged_at DESC)
  WHERE is_breaking;

-- =============================================
-- 2. EVENT DEDUP / COOLDOWN
-- =============================================

-- One row per distinct real-world event, not per article. A breach that
-- produces twelve articles over an afternoon collapses into a single story_key,
-- which is what stops the same story notifying repeatedly.
CREATE TABLE IF NOT EXISTS breaking_events (
  story_key        TEXT PRIMARY KEY,
  affected_entity  TEXT NOT NULL,
  category         TEXT NOT NULL
                     CHECK (category IN ('breach', 'outage', 'active_attack', 'critical_vuln')),
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_notified_at TIMESTAMPTZ,
  notify_count     INTEGER NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 3. PUSH DECISION LOG
-- =============================================

-- Every push decision is recorded, including the ones that were held back.
-- The daily cap is counted from this table, and suppressed rows are what make
-- a flood day reviewable after the fact instead of invisible.
CREATE TABLE IF NOT EXISTS breaking_pushes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_key   TEXT NOT NULL REFERENCES breaking_events(story_key) ON DELETE CASCADE,
  article_id  UUID REFERENCES articles(id) ON DELETE SET NULL,
  decided_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status      TEXT NOT NULL CHECK (status IN (
                'sent',                  -- delivered to Expo
                'pending_delivery',      -- qualified, but no push transport yet
                'suppressed_cooldown',   -- same entity+category notified recently
                'suppressed_daily_cap'   -- over the per-day ceiling
              )),
  reason      TEXT,
  body        TEXT
);

CREATE INDEX IF NOT EXISTS breaking_pushes_decided_at_idx
  ON breaking_pushes (decided_at DESC);

-- =============================================
-- 4. ROW LEVEL SECURITY
-- =============================================

-- Neither table is read by the app; only the workflow's service-role key
-- touches them, and that bypasses RLS. Enabling RLS with no policy therefore
-- denies anon/authenticated access by default, which is what we want.
ALTER TABLE breaking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaking_pushes ENABLE ROW LEVEL SECURITY;
