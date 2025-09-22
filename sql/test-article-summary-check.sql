-- Test script to check article summary fields
-- This will help us understand what data is actually in the database

-- Count total articles
SELECT 
  COUNT(*) as total_articles,
  COUNT(CASE WHEN summary IS NOT NULL AND summary != '' THEN 1 END) as articles_with_summary,
  COUNT(CASE WHEN what IS NOT NULL AND what != '' THEN 1 END) as articles_with_what,
  COUNT(CASE WHEN impact IS NOT NULL AND impact != '' THEN 1 END) as articles_with_impact,
  COUNT(CASE WHEN takeaways IS NOT NULL AND takeaways != '' THEN 1 END) as articles_with_takeaways,
  COUNT(CASE WHEN why_this_matters IS NOT NULL AND why_this_matters != '' THEN 1 END) as articles_with_why_this_matters,
  COUNT(CASE WHEN 
    summary IS NOT NULL AND summary != '' AND
    what IS NOT NULL AND what != '' AND
    impact IS NOT NULL AND impact != '' AND
    takeaways IS NOT NULL AND takeaways != '' AND
    why_this_matters IS NOT NULL AND why_this_matters != ''
  THEN 1 END) as articles_with_all_ai_fields
FROM articles;

-- Show sample articles with their AI field status
SELECT 
  id,
  title,
  CASE WHEN summary IS NOT NULL AND summary != '' THEN '✅' ELSE '❌' END as has_summary,
  CASE WHEN what IS NOT NULL AND what != '' THEN '✅' ELSE '❌' END as has_what,
  CASE WHEN impact IS NOT NULL AND impact != '' THEN '✅' ELSE '❌' END as has_impact,
  CASE WHEN takeaways IS NOT NULL AND takeaways != '' THEN '✅' ELSE '❌' END as has_takeaways,
  CASE WHEN why_this_matters IS NOT NULL AND why_this_matters != '' THEN '✅' ELSE '❌' END as has_why_this_matters,
  ai_summary_generated,
  created_at
FROM articles 
ORDER BY created_at DESC 
LIMIT 10;