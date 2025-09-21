-- Migration to update article summary fields from VARCHAR to TEXT
-- This prevents truncation of AI-generated content with "..." 

-- First, drop the article_details view since it depends on the columns we're altering
DROP VIEW IF EXISTS article_details;

-- Update summary field to TEXT (unlimited length)
ALTER TABLE articles 
ALTER COLUMN summary TYPE TEXT;

-- Update what field to TEXT (unlimited length)
ALTER TABLE articles 
ALTER COLUMN what TYPE TEXT;

-- Update impact field to TEXT (unlimited length)
ALTER TABLE articles 
ALTER COLUMN impact TYPE TEXT;

-- Update takeaways field to TEXT (unlimited length)
ALTER TABLE articles 
ALTER COLUMN takeaways TYPE TEXT;

-- Update why_this_matters field to TEXT (unlimited length)
ALTER TABLE articles 
ALTER COLUMN why_this_matters TYPE TEXT;

-- Recreate the article_details view
CREATE OR REPLACE VIEW article_details AS
SELECT 
  a.*,
  COALESCE(am.views, 0) as view_count,
  COALESCE(am.favorites, 0) as favorite_count,
  COALESCE(am.shares, 0) as share_count,
  COALESCE(am.avg_read_time, 0) as avg_read_time
FROM articles a
LEFT JOIN article_metrics am ON a.id = am.article_id;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'articles' 
  AND column_name IN ('summary', 'what', 'impact', 'takeaways', 'why_this_matters')
ORDER BY column_name;
