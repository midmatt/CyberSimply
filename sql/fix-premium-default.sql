-- =============================================
-- Fix Premium Default Issue
-- =============================================
-- This script fixes the issue where users are created with is_premium = TRUE
-- when they should start with is_premium = FALSE until they actually purchase IAP

-- Step 1: Check current state
SELECT 
  email,
  is_premium,
  ad_free,
  created_at
FROM user_profiles 
ORDER BY created_at DESC;

-- Step 2: Reset all existing users to is_premium = FALSE
-- (This will force them to go through the purchase flow)
UPDATE user_profiles 
SET 
  is_premium = FALSE,
  ad_free = FALSE,
  product_type = NULL,
  purchase_date = NULL,
  last_purchase_date = NULL
WHERE is_premium = TRUE;

-- Step 3: Verify the fix
SELECT 
  email,
  is_premium,
  ad_free,
  'RESET COMPLETE' as status
FROM user_profiles 
WHERE is_premium = FALSE
ORDER BY created_at DESC;

-- Step 4: Ensure schema defaults are correct
-- (This should already be correct, but let's verify)
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name IN ('is_premium', 'ad_free');

-- Step 5: Check user_iap table (should be empty for clean testing)
SELECT COUNT(*) as iap_records_count FROM user_iap;

-- If you want to clear IAP records too (for clean testing):
-- DELETE FROM user_iap;

RAISE NOTICE '✅ Premium default fix applied! All users now start with is_premium = FALSE';
RAISE NOTICE 'ℹ️  Users will need to purchase IAP to get premium access';
RAISE NOTICE 'ℹ️  New users will automatically get is_premium = FALSE';
