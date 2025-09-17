# Supabase Database Fix Guide

## Problem
You're getting the error: `Could not find the table 'public.user_profiles' in the schema cache`

## Root Cause
The `user_profiles` table doesn't exist in your Supabase database yet.

## Solution Steps

### Step 1: Access Supabase Dashboard
1. Go to: https://uaykrxfhzfkhjwnmvukb.supabase.co
2. Sign in to your account
3. You should see your project dashboard

### Step 2: Check Current Tables
1. In the left sidebar, click **"Table Editor"**
2. Look for any existing tables
3. If you see no tables or no `user_profiles` table, proceed to Step 3

### Step 3: Create the Table via SQL Editor
1. In the left sidebar, click **"SQL Editor"**
2. Click **"New Query"**
3. Copy and paste the following SQL:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_premium ON public.user_profiles(is_premium);

-- Create function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON public.user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create function for auto user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

4. Click **"Run"** to execute the SQL

### Step 4: Verify Table Creation
1. Go back to **"Table Editor"**
2. You should now see the `user_profiles` table
3. Click on it to see the columns and structure

### Step 5: Test the Fix
1. Go back to your React Native app
2. Try to sign up or sign in
3. The error should be resolved

## Alternative: If SQL Editor Doesn't Work

### Option A: Use Table Editor (Manual)
1. Go to **"Table Editor"**
2. Click **"New Table"**
3. Set table name: `user_profiles`
4. Add these columns:
   - `id` (UUID, Primary Key, References auth.users(id))
   - `email` (Text, Unique, Not Null)
   - `display_name` (Text, Nullable)
   - `avatar_url` (Text, Nullable)
   - `is_premium` (Boolean, Default: false)
   - `premium_expires_at` (Timestamp, Nullable)
   - `created_at` (Timestamp, Default: now())
   - `updated_at` (Timestamp, Default: now())

### Option B: Check Schema Exposure
1. Go to **"Settings"** → **"API"**
2. Under **"Exposed Schemas"**, make sure `public` is listed
3. If not, add `public` and save

## Verification Commands

After creating the table, you can test it with:

```sql
-- Test table exists
SELECT * FROM public.user_profiles LIMIT 1;

-- Test RLS policies
SELECT * FROM public.user_profiles WHERE id = auth.uid();
```

## Troubleshooting

### If you get permission errors:
1. Make sure you're using the service role key for admin operations
2. Check that your API keys are correct
3. Verify the table is in the `public` schema

### If the table still doesn't appear:
1. Refresh the Supabase dashboard
2. Check the SQL Editor for any error messages
3. Try creating a simple test table first

## Next Steps

Once the table is created:
1. Your app should work without the PGRST205 error
2. Users can sign up and get profiles automatically created
3. You can add more tables as needed using the same process
