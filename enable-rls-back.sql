-- Re-enable RLS on articles table
-- Run this in your Supabase SQL Editor after testing

-- Re-enable RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Create a simple RLS policy that allows all operations
CREATE POLICY "Allow all operations on articles" ON articles
FOR ALL USING (true) WITH CHECK (true);

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'articles';
