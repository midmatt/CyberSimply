-- Temporarily disable RLS on articles table for testing
-- Run this in your Supabase SQL Editor

-- Disable RLS temporarily
ALTER TABLE articles DISABLE ROW LEVEL SECURITY;

-- Check if RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'articles';
