-- Breaking-news push delivery: device token registry + failed push status.
-- Prefer running breaking-news-schema.sql first, but this file also creates
-- breaking_events / breaking_pushes if they are missing.
-- Safe to re-run: every statement is guarded.

-- =============================================
-- 1. NOTIFICATION TOKENS (guest-capable)
-- =============================================

CREATE TABLE IF NOT EXISTS notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  breaking_news BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Token is the device identity for guests and signed-in users alike.
CREATE UNIQUE INDEX IF NOT EXISTS notification_tokens_token_uidx
  ON notification_tokens (token);

CREATE INDEX IF NOT EXISTS notification_tokens_active_breaking_idx
  ON notification_tokens (is_active, breaking_news)
  WHERE is_active AND breaking_news;

-- Columns that older schema copies may be missing.
ALTER TABLE notification_tokens
  ADD COLUMN IF NOT EXISTS breaking_news BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Allow guest rows: drop NOT NULL on user_id if a prior migration required it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_tokens'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE notification_tokens ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- updated_at trigger (reuse shared function if present)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_tokens_updated_at ON notification_tokens;
CREATE TRIGGER update_notification_tokens_updated_at
  BEFORE UPDATE ON notification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. RLS — clients may register/update their token
-- =============================================

ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notification tokens" ON notification_tokens;
DROP POLICY IF EXISTS "Anyone can insert a device token" ON notification_tokens;
DROP POLICY IF EXISTS "Anyone can update a device token" ON notification_tokens;
DROP POLICY IF EXISTS "Anyone can read own device tokens" ON notification_tokens;

-- Insert: guests (null user_id) or the signed-in owner.
CREATE POLICY "Anyone can insert a device token" ON notification_tokens
  FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Update: same ownership rule. Clients update by matching their Expo token.
CREATE POLICY "Anyone can update a device token" ON notification_tokens
  FOR UPDATE
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Select: signed-in users see their rows; guests can read null-user rows
-- (needed so the settings toggle can round-trip). Service role bypasses RLS.
CREATE POLICY "Anyone can read own device tokens" ON notification_tokens
  FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

-- =============================================
-- 3. BREAKING_EVENTS / BREAKING_PUSHES
-- =============================================
-- These normally come from breaking-news-schema.sql. Create them here too so
-- this migration can run alone if that file was never applied.

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

CREATE TABLE IF NOT EXISTS breaking_pushes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_key   TEXT NOT NULL REFERENCES breaking_events(story_key) ON DELETE CASCADE,
  article_id  UUID REFERENCES articles(id) ON DELETE SET NULL,
  decided_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status      TEXT NOT NULL CHECK (status IN (
                'sent',
                'pending_delivery',
                'suppressed_cooldown',
                'suppressed_daily_cap',
                'failed'
              )),
  reason      TEXT,
  body        TEXT
);

CREATE INDEX IF NOT EXISTS breaking_pushes_decided_at_idx
  ON breaking_pushes (decided_at DESC);

ALTER TABLE breaking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaking_pushes ENABLE ROW LEVEL SECURITY;

-- If breaking_pushes already existed from an older schema (without 'failed'),
-- replace the status check. Skip entirely when the table was just created above.
DO $$
DECLARE
  constraint_name TEXT;
  constraint_def TEXT;
BEGIN
  IF to_regclass('public.breaking_pushes') IS NULL THEN
    RETURN;
  END IF;

  SELECT conname, pg_get_constraintdef(oid)
    INTO constraint_name, constraint_def
  FROM pg_constraint
  WHERE conrelid = 'public.breaking_pushes'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
  LIMIT 1;

  -- Already allows failed — nothing to do.
  IF constraint_def IS NOT NULL AND constraint_def ILIKE '%failed%' THEN
    RETURN;
  END IF;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE breaking_pushes DROP CONSTRAINT %I', constraint_name);
  END IF;

  ALTER TABLE breaking_pushes
    ADD CONSTRAINT breaking_pushes_status_check
    CHECK (status IN (
      'sent',
      'pending_delivery',
      'suppressed_cooldown',
      'suppressed_daily_cap',
      'failed'
    ));
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

