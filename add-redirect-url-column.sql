-- Add redirect_url column to articles table
-- This column stores the original article URL for external linking

-- Add the redirect_url column
ALTER TABLE articles ADD COLUMN IF NOT EXISTS redirect_url TEXT;

-- Create an index on redirect_url for better performance
CREATE INDEX IF NOT EXISTS idx_articles_redirect_url ON articles(redirect_url);

-- Update existing articles with sample redirect URLs (for testing)
UPDATE articles 
SET redirect_url = CASE 
  WHEN id = 'sample-article-1' THEN 'https://example.com/cybersecurity-best-practices-2024'
  WHEN id = 'sample-article-2' THEN 'https://example.com/protect-personal-data-online'
  WHEN id = 'sample-article-3' THEN 'https://example.com/understanding-phishing-attacks'
  ELSE 'https://example.com/article-' || id
END
WHERE redirect_url IS NULL;

-- Verify the column was added successfully
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'articles' 
  AND column_name = 'redirect_url';

-- Show sample data with redirect_url
SELECT 
  id, 
  title, 
  category, 
  redirect_url,
  published_at
FROM articles 
ORDER BY published_at DESC 
LIMIT 5;
