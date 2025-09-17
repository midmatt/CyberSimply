-- Set up automatic article fetching with Supabase cron jobs
-- Run this in your Supabase SQL Editor

-- First, enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to call the Edge Function
CREATE OR REPLACE FUNCTION fetch_articles_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the Edge Function
  PERFORM
    net.http_post(
      url := 'https://uaykrxfhzfkhjwnmvukb.supabase.co/functions/v1/fetch-articles',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := '{}'::jsonb
    );
END;
$$;

-- Schedule the cron job to run every 6 hours
-- This will fetch fresh articles 4 times per day
SELECT cron.schedule(
  'fetch-articles-every-6-hours',
  '0 */6 * * *',  -- Every 6 hours
  'SELECT fetch_articles_cron();'
);

-- Alternative: Run every 4 hours (6 times per day)
-- SELECT cron.schedule(
--   'fetch-articles-every-4-hours',
--   '0 */4 * * *',  -- Every 4 hours
--   'SELECT fetch_articles_cron();'
-- );

-- Alternative: Run every 12 hours (2 times per day)
-- SELECT cron.schedule(
--   'fetch-articles-every-12-hours',
--   '0 */12 * * *',  -- Every 12 hours
--   'SELECT fetch_articles_cron();'
-- );

-- Check scheduled jobs
SELECT * FROM cron.job;

-- To remove a job later:
-- SELECT cron.unschedule('fetch-articles-every-6-hours');
