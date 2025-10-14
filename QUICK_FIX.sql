-- QUICK FIX: Reset all users to is_premium = FALSE
UPDATE user_profiles 
SET 
  is_premium = FALSE,
  ad_free = FALSE,
  product_type = NULL,
  purchase_date = NULL,
  last_purchase_date = NULL;

-- Verify the fix
SELECT email, is_premium, ad_free FROM user_profiles;
