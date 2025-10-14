-- =============================================
-- Migration Script: Legacy IAP to StoreKit 2
-- =============================================
-- This script ensures backwards compatibility for existing users
-- who purchased before the StoreKit 2 upgrade.

-- =============================================
-- FUNCTIONS (Create if not exists)
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Step 1: Add new columns to user_profiles (if not exists)
-- =============================================

-- Add ad_free column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'ad_free'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN ad_free BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN user_profiles.ad_free IS 'TRUE only after verified purchase (StoreKit 2)';
    END IF;
END $$;

-- Add product_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'product_type'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN product_type TEXT;
        COMMENT ON COLUMN user_profiles.product_type IS 'lifetime or subscription';
    END IF;
END $$;

-- Add purchase_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'purchase_date'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN purchase_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add last_purchase_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'last_purchase_date'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN last_purchase_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- =============================================
-- Step 2: Migrate existing premium users to ad_free
-- =============================================

-- For users who are already premium but don't have ad_free set,
-- grant them ad_free access (backwards compatibility)
UPDATE user_profiles
SET 
  ad_free = TRUE,
  product_type = CASE 
    WHEN premium_expires_at IS NULL OR premium_expires_at > NOW() + INTERVAL '1 year' 
    THEN 'lifetime'
    ELSE 'subscription'
  END,
  purchase_date = COALESCE(purchase_date, created_at),
  last_purchase_date = COALESCE(last_purchase_date, created_at)
WHERE 
  is_premium = TRUE 
  AND ad_free IS NOT TRUE
  AND (premium_expires_at IS NULL OR premium_expires_at > NOW());

-- Log migration results
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM user_profiles
  WHERE is_premium = TRUE AND ad_free = TRUE;
  
  RAISE NOTICE '✅ Migrated % existing premium users to ad_free status', migrated_count;
END $$;

-- =============================================
-- Step 3: Create legacy purchase records in user_iap
-- =============================================

-- For existing premium users without user_iap records,
-- create synthetic transaction records for tracking
INSERT INTO user_iap (
  user_id,
  transaction_id,
  original_transaction_id,
  product_id,
  purchase_date,
  original_purchase_date,
  expires_date,
  is_active,
  environment,
  last_notification_type,
  last_notification_date
)
SELECT 
  id as user_id,
  'legacy_' || id::text as transaction_id, -- Synthetic transaction ID
  'legacy_' || id::text as original_transaction_id,
  CASE 
    WHEN product_type = 'lifetime' OR premium_expires_at IS NULL 
    THEN 'com.cybersimply.adfree.lifetime.2025'
    ELSE 'com.cybersimply.adfree.monthly.2025'
  END as product_id,
  COALESCE(purchase_date, created_at) as purchase_date,
  COALESCE(purchase_date, created_at) as original_purchase_date,
  premium_expires_at as expires_date,
  TRUE as is_active,
  'production' as environment,
  'LEGACY_MIGRATION' as last_notification_type,
  NOW() as last_notification_date
FROM user_profiles
WHERE 
  ad_free = TRUE 
  AND is_premium = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM user_iap 
    WHERE user_iap.user_id = user_profiles.id
  );

-- Log creation results
DO $$
DECLARE
  created_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO created_count
  FROM user_iap
  WHERE last_notification_type = 'LEGACY_MIGRATION';
  
  RAISE NOTICE '✅ Created % legacy transaction records in user_iap', created_count;
END $$;

-- =============================================
-- Step 4: Verify migration
-- =============================================

-- Check for any inconsistencies
DO $$
DECLARE
  inconsistent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO inconsistent_count
  FROM user_profiles up
  LEFT JOIN user_iap ui ON up.id = ui.user_id AND ui.is_active = TRUE
  WHERE up.ad_free = TRUE 
    AND ui.id IS NULL;
  
  IF inconsistent_count > 0 THEN
    RAISE WARNING '⚠️  Found % users with ad_free=TRUE but no active user_iap record', inconsistent_count;
  ELSE
    RAISE NOTICE '✅ All ad-free users have corresponding user_iap records';
  END IF;
END $$;

-- =============================================
-- Step 5: Update RLS policies for user_iap (if needed)
-- =============================================

-- Ensure users can read their own IAP records
DROP POLICY IF EXISTS "Users can view their own purchases" ON user_iap;
CREATE POLICY "Users can view their own purchases" ON user_iap
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all
DROP POLICY IF EXISTS "Service role can manage all purchases" ON user_iap;
CREATE POLICY "Service role can manage all purchases" ON user_iap
  FOR ALL USING (auth.role() = 'service_role');

-- Users can insert their own purchases
DROP POLICY IF EXISTS "Users can insert their own purchases" ON user_iap;
CREATE POLICY "Users can insert their own purchases" ON user_iap
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Verification Query
-- =============================================

-- Run this to verify migration success:
/*
SELECT 
  COUNT(*) FILTER (WHERE ad_free = TRUE) as adfree_users,
  COUNT(*) FILTER (WHERE is_premium = TRUE) as premium_users,
  COUNT(DISTINCT ui.user_id) FILTER (WHERE ui.is_active = TRUE) as users_with_active_iap
FROM user_profiles up
LEFT JOIN user_iap ui ON up.id = ui.user_id;
*/

RAISE NOTICE '✅ Migration complete! Run verification query to check results.';
RAISE NOTICE 'ℹ️  Legacy purchases are marked with transaction_id starting with "legacy_"';
RAISE NOTICE 'ℹ️  These users will continue to have ad-free access seamlessly.';
