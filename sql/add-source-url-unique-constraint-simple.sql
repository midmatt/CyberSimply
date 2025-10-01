-- Add unique constraint to source_url column in articles table
-- This allows upsert operations using source_url as the conflict target

-- Step 1: Remove any duplicate source_urls (keep the most recent one)
DELETE FROM articles a
USING articles b
WHERE a.id < b.id 
  AND a.source_url = b.source_url
  AND a.source_url IS NOT NULL;

-- Step 2: Add the unique constraint
ALTER TABLE articles 
ADD CONSTRAINT articles_source_url_unique 
UNIQUE (source_url);

-- Step 3: Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_articles_source_url 
ON articles(source_url);

-- Done! You should see "Success" if this worked correctly

