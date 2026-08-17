-- Supabase RPC Function for User Profiles Migration
-- This function can be called from the app to ensure ad_free column exists

CREATE OR REPLACE FUNCTION migrate_user_profiles_add_ad_free()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  columns_added integer := 0;
  rows_updated integer := 0;
BEGIN
  -- Add ad_free column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'ad_free'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN ad_free BOOLEAN DEFAULT FALSE;
    columns_added := columns_added + 1;
    RAISE NOTICE 'Added ad_free column to user_profiles';
  END IF;

  -- Add is_premium column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
    columns_added := columns_added + 1;
    RAISE NOTICE 'Added is_premium column to user_profiles';
  END IF;

  -- Add premium_expires_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'premium_expires_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN premium_expires_at TIMESTAMPTZ;
    columns_added := columns_added + 1;
    RAISE NOTICE 'Added premium_expires_at column to user_profiles';
  END IF;

  -- Add product_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN product_type TEXT 
    CHECK (product_type IN ('lifetime', 'subscription'));
    columns_added := columns_added + 1;
    RAISE NOTICE 'Added product_type column to user_profiles';
  END IF;

  -- Add purchase_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN purchase_date TIMESTAMPTZ;
    columns_added := columns_added + 1;
    RAISE NOTICE 'Added purchase_date column to user_profiles';
  END IF;

  -- Update NULL values to FALSE for ad_free
  UPDATE user_profiles SET ad_free = FALSE WHERE ad_free IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  -- Update NULL values to FALSE for is_premium
  UPDATE user_profiles SET is_premium = FALSE WHERE is_premium IS NULL;

  -- Create indexes if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_profiles' AND indexname = 'idx_user_profiles_ad_free'
  ) THEN
    CREATE INDEX idx_user_profiles_ad_free ON user_profiles(ad_free);
    RAISE NOTICE 'Created index idx_user_profiles_ad_free';
  END IF;

  -- Build result JSON
  result := json_build_object(
    'success', true,
    'columns_added', columns_added,
    'rows_updated', rows_updated,
    'message', 'Migration completed successfully',
    'timestamp', NOW()
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'timestamp', NOW()
    );
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION migrate_user_profiles_add_ad_free() TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_user_profiles_add_ad_free() TO anon;

COMMENT ON FUNCTION migrate_user_profiles_add_ad_free() IS 
'Runtime migration function to ensure user_profiles has all required columns for ad-free functionality. Safe to call multiple times.';
