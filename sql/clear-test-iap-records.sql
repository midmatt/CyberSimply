-- =============================================
-- Clear Test IAP Records
-- =============================================
-- This script clears test IAP records that might be causing
-- the TestFlight app to show automatic ad-free access

-- WARNING: This will clear ALL IAP records for testing
-- Only run this in development/testing environments

-- Check current IAP records
SELECT 
  user_id,
  product_id,
  transaction_id,
  purchase_date,
  is_active,
  environment
FROM user_iap 
ORDER BY purchase_date DESC;

-- Clear all IAP records (for testing only)
-- DELETE FROM user_iap;

-- Clear ad-free status from user_profiles (for testing only)
-- UPDATE user_profiles SET ad_free = FALSE;

-- Check user profiles with ad-free access
SELECT 
  id,
  email,
  ad_free,
  product_type,
  purchase_date
FROM user_profiles 
WHERE ad_free = TRUE
ORDER BY purchase_date DESC;

-- To reset a specific user for testing:
-- UPDATE user_profiles SET ad_free = FALSE WHERE email = 'test@example.com';
-- DELETE FROM user_iap WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'test@example.com');
