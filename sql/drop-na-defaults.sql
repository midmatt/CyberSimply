-- Drops the 'N/A' column defaults on the four AI summary fields.
-- Applied to the live database on 2026-08-12. Safe to re-run.
--
-- The live `articles` table defaulted what/impact/takeaways/why_this_matters to
-- the literal string 'N/A' (the repo's own schema files never had this — it was
-- applied out of band). Any writer that omitted those columns therefore wrote
-- placeholders instead of NULLs, and the breaking-news pipeline did exactly
-- that: every breaking article landed in the feed showing "N/A" under all four
-- headings. The default was also a trap for summarize-articles.mjs, whose
-- server-side filter looked for NULLs, so a row that had the flag flipped true
-- while still holding 'N/A' would never be picked up again.
--
-- NULL is the correct absent value here: ArticleDetail renders its own fallback
-- copy for it, and the nightly summarizer's filter finds it.

ALTER TABLE articles ALTER COLUMN what DROP DEFAULT;
ALTER TABLE articles ALTER COLUMN impact DROP DEFAULT;
ALTER TABLE articles ALTER COLUMN takeaways DROP DEFAULT;
ALTER TABLE articles ALTER COLUMN why_this_matters DROP DEFAULT;

-- Rows already carrying the placeholder. The nightly summarizer picks these up
-- on its own now that its filter matches 'N/A', but this clears them
-- immediately so nothing renders "N/A" in the meantime.
UPDATE articles
SET what = NULLIF(what, 'N/A'),
    impact = NULLIF(impact, 'N/A'),
    takeaways = NULLIF(takeaways, 'N/A'),
    why_this_matters = NULLIF(why_this_matters, 'N/A'),
    ai_summary_generated = false
WHERE what = 'N/A'
   OR impact = 'N/A'
   OR takeaways = 'N/A'
   OR why_this_matters = 'N/A';
