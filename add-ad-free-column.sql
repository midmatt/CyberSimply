-- Add ad_free column to user_profiles table
-- Run this in Supabase SQL Editor

-- Add the ad_free column
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS ad_free BOOLEAN DEFAULT FALSE;

-- Add an index for better performance when querying ad_free status
CREATE INDEX IF NOT EXISTS idx_user_profiles_ad_free ON public.user_profiles(ad_free);

-- Update the updated_at trigger to include the new column
-- (The existing trigger should already handle this automatically)

-- Add a comment to document the column
COMMENT ON COLUMN public.user_profiles.ad_free IS 'Indicates if the user has purchased ad-free access via StoreKit IAP';
