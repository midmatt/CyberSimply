-- Migration to update article summary fields from VARCHAR to TEXT
-- This prevents truncation of AI-generated content with "..." 

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

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'articles' 
  AND column_name IN ('summary', 'what', 'impact', 'takeaways', 'why_this_matters')
ORDER BY column_name;
