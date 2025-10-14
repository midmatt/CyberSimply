-- URGENT FIX: Reset ALL ad-free status to force purchase flow
-- Run this in Supabase SQL Editor immediately

-- Step 1: Reset all users to NOT have ad-free access
UPDATE user_profiles 
SET 
  is_premium = FALSE,
  ad_free = FALSE,
  product_type = NULL,
  purchase_date = NULL,
  last_purchase_date = NULL,
  premium_expires_at = NULL;

-- Step 2: Clear any IAP records (for testing)
DELETE FROM user_iap;

-- Step 3: Verify the fix
SELECT 
  email,
  is_premium,
  ad_free,
  product_type
FROM user_profiles 
ORDER BY created_at DESC;

-- Expected result: All users should show is_premium=FALSE and ad_free=FALSE
