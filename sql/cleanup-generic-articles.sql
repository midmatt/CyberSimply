-- Cleanup script to remove generic placeholder content from articles
-- This ensures old placeholder rows don't show generic text in the app

-- Update articles that contain generic placeholder text
UPDATE articles
SET 
  what = NULL,
  impact = NULL,
  takeaways = NULL,
  why_this_matters = NULL
WHERE 
  what ILIKE '%Details not available%' OR
  what ILIKE '%Unable to determine%' OR
  what ILIKE '%What happened:%Details not available%' OR
  impact ILIKE '%Unable to determine%' OR
  impact ILIKE '%This may affect various stakeholders%' OR
  impact ILIKE '%Impact:%Unable to determine%' OR
  takeaways ILIKE '%Stay informed%' OR
  takeaways ILIKE '%Key takeaways:%Stay informed%' OR
  takeaways ILIKE '%Key lessons%' OR
  why_this_matters ILIKE '%Understanding cybersecurity%' OR
  why_this_matters ILIKE '%Why this matters:%Understanding cybersecurity%' OR
  why_this_matters ILIKE '%Important to understand%' OR
  summary ILIKE '%Details not available%' OR
  summary ILIKE '%Unable to determine%';

-- Also clean up very short or generic content
UPDATE articles
SET 
  what = NULL,
  impact = NULL,
  takeaways = NULL,
  why_this_matters = NULL
WHERE 
  LENGTH(what) < 20 OR
  LENGTH(impact) < 20 OR
  LENGTH(takeaways) < 20 OR
  LENGTH(why_this_matters) < 20;

-- Show statistics of cleaned articles
SELECT 
  COUNT(*) as total_articles,
  COUNT(CASE WHEN what IS NOT NULL THEN 1 END) as articles_with_what,
  COUNT(CASE WHEN impact IS NOT NULL THEN 1 END) as articles_with_impact,
  COUNT(CASE WHEN takeaways IS NOT NULL THEN 1 END) as articles_with_takeaways,
  COUNT(CASE WHEN why_this_matters IS NOT NULL THEN 1 END) as articles_with_why_matters,
  COUNT(CASE WHEN what IS NOT NULL AND impact IS NOT NULL AND takeaways IS NOT NULL AND why_this_matters IS NOT NULL THEN 1 END) as articles_with_all_fields
FROM articles;
