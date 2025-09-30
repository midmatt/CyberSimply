-- Test Article Summary Fields
-- This script checks the quality and completeness of article summary fields

-- Check for articles with missing or incomplete summary fields
SELECT 
  'Articles with NULL or empty summary fields' as check_type,
  COUNT(*) as count
FROM articles 
WHERE 
  what IS NULL OR what = '' OR what = 'N/A' OR
  impact IS NULL OR impact = '' OR impact = 'N/A' OR
  takeaways IS NULL OR takeaways = '' OR takeaways = 'N/A' OR
  why_this_matters IS NULL OR why_this_matters = '' OR why_this_matters = 'N/A';

-- Check for articles with missing categories
SELECT 
  'Articles with NULL or invalid categories' as check_type,
  COUNT(*) as count
FROM articles 
WHERE 
  category IS NULL OR 
  category = '' OR 
  category NOT IN ('cybersecurity', 'hacking', 'general');

-- Check for articles with missing source URLs
SELECT 
  'Articles with NULL or empty source_url' as check_type,
  COUNT(*) as count
FROM articles 
WHERE 
  source_url IS NULL OR source_url = '';

-- Check total article count
SELECT 
  'Total articles in database' as check_type,
  COUNT(*) as count
FROM articles;

-- Sample recent articles with their summary completeness
SELECT 
  'Recent articles summary status' as check_type,
  title,
  CASE 
    WHEN what IS NOT NULL AND what != '' AND what != 'N/A' THEN '✅'
    ELSE '❌'
  END as has_what,
  CASE 
    WHEN impact IS NOT NULL AND impact != '' AND impact != 'N/A' THEN '✅'
    ELSE '❌'
  END as has_impact,
  CASE 
    WHEN takeaways IS NOT NULL AND takeaways != '' AND takeaways != 'N/A' THEN '✅'
    ELSE '❌'
  END as has_takeaways,
  CASE 
    WHEN why_this_matters IS NOT NULL AND why_this_matters != '' AND why_this_matters != 'N/A' THEN '✅'
    ELSE '❌'
  END as has_why_this_matters,
  category,
  published_at
FROM articles 
ORDER BY published_at DESC 
LIMIT 10;
