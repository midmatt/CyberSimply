-- Migration: Add ad_free column to user_profiles table
-- This column tracks if a user has purchased ad-free access

-- Add ad_free column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'ad_free'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN ad_free BOOLEAN DEFAULT FALSE;
    
    RAISE NOTICE 'Added ad_free column to user_profiles';
  ELSE
    RAISE NOTICE 'ad_free column already exists in user_profiles';
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_ad_free ON user_profiles(ad_free);

-- Add is_premium column if it doesn't exist (for backwards compatibility)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
    
    RAISE NOTICE 'Added is_premium column to user_profiles';
  ELSE
    RAISE NOTICE 'is_premium column already exists in user_profiles';
  END IF;
END $$;

-- Add premium_expires_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'premium_expires_at'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN premium_expires_at TIMESTAMPTZ;
    
    RAISE NOTICE 'Added premium_expires_at column to user_profiles';
  ELSE
    RAISE NOTICE 'premium_expires_at column already exists in user_profiles';
  END IF;
END $$;

-- Add product_type column to track lifetime vs subscription
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN product_type TEXT CHECK (product_type IN ('lifetime', 'subscription'));
    
    RAISE NOTICE 'Added product_type column to user_profiles';
  ELSE
    RAISE NOTICE 'product_type column already exists in user_profiles';
  END IF;
END $$;

-- Add purchase_date column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN purchase_date TIMESTAMPTZ;
    
    RAISE NOTICE 'Added purchase_date column to user_profiles';
  ELSE
    RAISE NOTICE 'purchase_date column already exists in user_profiles';
  END IF;
END $$;

-- Create function to automatically set ad_free = true when is_premium = true
CREATE OR REPLACE FUNCTION sync_ad_free_with_premium()
RETURNS TRIGGER AS $$
BEGIN
  -- If is_premium is set to true, also set ad_free to true
  IF NEW.is_premium = TRUE AND OLD.is_premium IS DISTINCT FROM TRUE THEN
    NEW.ad_free = TRUE;
  END IF;
  
  -- If ad_free is set to true, also set is_premium to true
  IF NEW.ad_free = TRUE AND OLD.ad_free IS DISTINCT FROM TRUE THEN
    NEW.is_premium = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync ad_free and is_premium
DROP TRIGGER IF EXISTS trigger_sync_ad_free_premium ON user_profiles;
CREATE TRIGGER trigger_sync_ad_free_premium
  BEFORE UPDATE OF ad_free, is_premium ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_ad_free_with_premium();

COMMENT ON COLUMN user_profiles.ad_free IS 'Whether the user has purchased ad-free access (lifetime or active subscription)';
COMMENT ON COLUMN user_profiles.is_premium IS 'Legacy column - synced with ad_free for backwards compatibility';
COMMENT ON COLUMN user_profiles.premium_expires_at IS 'Expiration date for subscription-based ad-free access (NULL for lifetime)';
COMMENT ON COLUMN user_profiles.product_type IS 'Type of ad-free product: lifetime or subscription';
COMMENT ON COLUMN user_profiles.purchase_date IS 'Date when the ad-free product was purchased';
