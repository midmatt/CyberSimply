-- =============================================
-- Fix user_iap Table - Add Missing Columns
-- =============================================
-- Run this if you get "column does not exist" errors
-- This adds any missing columns to the user_iap table

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add last_notification_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_iap' AND column_name = 'last_notification_type'
    ) THEN
        ALTER TABLE user_iap ADD COLUMN last_notification_type TEXT;
        RAISE NOTICE 'Added last_notification_type column';
    END IF;

    -- Add last_notification_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_iap' AND column_name = 'last_notification_date'
    ) THEN
        ALTER TABLE user_iap ADD COLUMN last_notification_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_notification_date column';
    END IF;

    -- Add environment column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_iap' AND column_name = 'environment'
    ) THEN
        ALTER TABLE user_iap ADD COLUMN environment TEXT DEFAULT 'production';
        RAISE NOTICE 'Added environment column';
    END IF;

    -- Add receipt_data column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_iap' AND column_name = 'receipt_data'
    ) THEN
        ALTER TABLE user_iap ADD COLUMN receipt_data TEXT;
        RAISE NOTICE 'Added receipt_data column';
    END IF;

    -- Add original_transaction_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_iap' AND column_name = 'original_transaction_id'
    ) THEN
        ALTER TABLE user_iap ADD COLUMN original_transaction_id TEXT;
        RAISE NOTICE 'Added original_transaction_id column';
    END IF;

    -- Add original_purchase_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_iap' AND column_name = 'original_purchase_date'
    ) THEN
        ALTER TABLE user_iap ADD COLUMN original_purchase_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added original_purchase_date column';
    END IF;

    -- Add expires_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_iap' AND column_name = 'expires_date'
    ) THEN
        ALTER TABLE user_iap ADD COLUMN expires_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added expires_date column';
    END IF;

    -- Add is_active column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_iap' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE user_iap ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added is_active column';
    END IF;

    -- Add created_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_iap' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE user_iap ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    END IF;

    -- Add updated_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_iap' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE user_iap ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;
END $$;

-- =============================================
-- Create function if not exists
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Create trigger if not exists
-- =============================================

DROP TRIGGER IF EXISTS update_user_iap_updated_at ON user_iap;
CREATE TRIGGER update_user_iap_updated_at 
  BEFORE UPDATE ON user_iap 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Create indexes if not exists
-- =============================================

CREATE INDEX IF NOT EXISTS idx_user_iap_user_id ON user_iap(user_id);
CREATE INDEX IF NOT EXISTS idx_user_iap_transaction_id ON user_iap(transaction_id);
CREATE INDEX IF NOT EXISTS idx_user_iap_product_id ON user_iap(product_id);
CREATE INDEX IF NOT EXISTS idx_user_iap_is_active ON user_iap(is_active);
CREATE INDEX IF NOT EXISTS idx_user_iap_expires_date ON user_iap(expires_date);

-- =============================================
-- Enable RLS if not enabled
-- =============================================

ALTER TABLE user_iap ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Create RLS policies if not exist
-- =============================================

-- Users can read their own IAP records
DROP POLICY IF EXISTS "Users can view their own purchases" ON user_iap;
CREATE POLICY "Users can view their own purchases" ON user_iap
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all IAP records
DROP POLICY IF EXISTS "Service role can manage all purchases" ON user_iap;
CREATE POLICY "Service role can manage all purchases" ON user_iap
  FOR ALL USING (auth.role() = 'service_role');

-- Authenticated users can insert their own purchases
DROP POLICY IF EXISTS "Users can insert their own purchases" ON user_iap;
CREATE POLICY "Users can insert their own purchases" ON user_iap
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Verification
-- =============================================

-- Check that all columns exist
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_iap'
ORDER BY ordinal_position;

RAISE NOTICE '✅ user_iap table fix completed successfully!';
