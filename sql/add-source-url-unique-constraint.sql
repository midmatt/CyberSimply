-- Add unique constraint to source_url column in articles table
-- This allows upsert operations using source_url as the conflict target

-- First, remove any duplicate source_urls (keep the most recent one)
DELETE FROM articles a
USING articles b
WHERE a.id < b.id 
  AND a.source_url = b.source_url
  AND a.source_url IS NOT NULL;

-- Now add the unique constraint
ALTER TABLE articles 
ADD CONSTRAINT articles_source_url_unique 
UNIQUE (source_url);

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_articles_source_url 
ON articles(source_url);

-- Verify the constraint was added
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'articles'::regclass
  AND conname = 'articles_source_url_unique';

