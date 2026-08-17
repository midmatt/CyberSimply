-- Fix for new users getting ad-free status automatically

-- Update the handle_new_user function to explicitly set ad_free and is_premium to FALSE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, is_premium, ad_free)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    FALSE,  -- Ensure new users start with is_premium = FALSE
    FALSE   -- Ensure new users start with ad_free = FALSE
  );
  
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it uses the updated function
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
    RAISE NOTICE 'Dropped existing trigger on_auth_user_created';
  END IF;
  
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    RAISE NOTICE 'Created new trigger on_auth_user_created';
END $$;

-- Optional: Check if there are any existing users with incorrect ad_free status
-- This query will show any users who might have been created with ad_free = true incorrectly
SELECT 
  id, 
  email, 
  display_name, 
  is_premium, 
  ad_free, 
  created_at 
FROM user_profiles 
WHERE ad_free = true 
  AND (premium_expires_at IS NULL OR premium_expires_at < NOW())
ORDER BY created_at DESC;

-- Note: If you see results above, those users should have their ad_free status corrected
-- You can run the following to fix them (uncomment if needed):
-- UPDATE user_profiles 
-- SET ad_free = false, is_premium = false 
-- WHERE ad_free = true 
--   AND (premium_expires_at IS NULL OR premium_expires_at < NOW());