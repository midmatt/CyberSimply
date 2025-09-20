-- Test script to verify article summary fields are being populated correctly
-- This script checks if articles have all required AI-generated fields

-- Check total articles count
SELECT 
  'Total Articles' as metric,
  COUNT(*) as count
FROM articles;

-- Check articles with complete AI summaries
SELECT 
  'Articles with Complete AI Summaries' as metric,
  COUNT(*) as count
FROM articles 
WHERE 
  summary IS NOT NULL 
  AND what IS NOT NULL 
  AND impact IS NOT NULL 
  AND takeaways IS NOT NULL 
  AND why_this_matters IS NOT NULL
  AND ai_summary_generated = true;

-- Check articles missing specific fields
SELECT 
  'Articles Missing Summary' as metric,
  COUNT(*) as count
FROM articles 
WHERE summary IS NULL OR summary = '';

SELECT 
  'Articles Missing What' as metric,
  COUNT(*) as count
FROM articles 
WHERE what IS NULL OR what = '';

SELECT 
  'Articles Missing Impact' as metric,
  COUNT(*) as count
FROM articles 
WHERE impact IS NULL OR impact = '';

SELECT 
  'Articles Missing Takeaways' as metric,
  COUNT(*) as count
FROM articles 
WHERE takeaways IS NULL OR takeaways = '';

SELECT 
  'Articles Missing Why This Matters' as metric,
  COUNT(*) as count
FROM articles 
WHERE why_this_matters IS NULL OR why_this_matters = '';

-- Check recent articles (last 24 hours) with complete data
SELECT 
  'Recent Articles (24h) with Complete Data' as metric,
  COUNT(*) as count
FROM articles 
WHERE 
  created_at >= NOW() - INTERVAL '24 hours'
  AND summary IS NOT NULL 
  AND what IS NOT NULL 
  AND impact IS NOT NULL 
  AND takeaways IS NOT NULL 
  AND why_this_matters IS NOT NULL
  AND ai_summary_generated = true;

-- Sample of recent articles with their field completion status
SELECT 
  'Sample Recent Articles' as section,
  title,
  CASE 
    WHEN summary IS NOT NULL AND summary != '' THEN '✓' ELSE '✗' 
  END as has_summary,
  CASE 
    WHEN what IS NOT NULL AND what != '' THEN '✓' ELSE '✗' 
  END as has_what,
  CASE 
    WHEN impact IS NOT NULL AND impact != '' THEN '✓' ELSE '✗' 
  END as has_impact,
  CASE 
    WHEN takeaways IS NOT NULL AND takeaways != '' THEN '✓' ELSE '✗' 
  END as has_takeaways,
  CASE 
    WHEN why_this_matters IS NOT NULL AND why_this_matters != '' THEN '✓' ELSE '✗' 
  END as has_why_this_matters,
  ai_summary_generated,
  created_at
FROM articles 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC 
LIMIT 10;

-- Summary report
SELECT 
  'SUMMARY REPORT' as report_type,
  ROUND(
    (COUNT(CASE WHEN summary IS NOT NULL AND what IS NOT NULL AND impact IS NOT NULL AND takeaways IS NOT NULL AND why_this_matters IS NOT NULL AND ai_summary_generated = true THEN 1 END) * 100.0) / 
    NULLIF(COUNT(*), 0), 
    2
  ) as completion_percentage
FROM articles;
