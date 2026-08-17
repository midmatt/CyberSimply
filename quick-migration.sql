-- Quick migration to add redirect_url column
-- Copy and paste this into your Supabase SQL Editor

-- Step 1: Add the redirect_url column
ALTER TABLE articles ADD COLUMN redirect_url TEXT;

-- Step 2: Create an index for better performance
CREATE INDEX idx_articles_redirect_url ON articles(redirect_url);

-- Step 3: Update existing articles with sample redirect URLs
UPDATE articles 
SET redirect_url = 'https://example.com/article-' || id
WHERE redirect_url IS NULL;

-- Step 4: Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'articles' 
  AND column_name = 'redirect_url';

-- Step 5: Show sample data with redirect_url
SELECT 
  id, 
  title, 
  category, 
  redirect_url
FROM articles 
ORDER BY created_at DESC 
LIMIT 5;
