-- Create IAP tracking tables for CyberSimply
-- Run this in Supabase SQL Editor

-- Add ad_free column to user_profiles if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS ad_free BOOLEAN DEFAULT FALSE;

-- Create IAP status table for tracking purchases
CREATE TABLE IF NOT EXISTS user_iap_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  transaction_id TEXT UNIQUE NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
  expiration_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  receipt_data TEXT, -- Store the full receipt for verification
  apple_verification_status TEXT, -- 'verified', 'expired', 'invalid'
  last_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one active subscription per product type per user
  UNIQUE(user_id, product_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Create IAP products table for reference
CREATE TABLE IF NOT EXISTS iap_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  product_type TEXT NOT NULL, -- 'subscription', 'lifetime'
  duration_days INTEGER, -- For subscriptions, null for lifetime
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default IAP products
INSERT INTO iap_products (id, name, description, price, currency, product_type, duration_days) VALUES
('com.cybersimply.adfree.lifetime', 'Ad-Free Lifetime', 'Remove all ads forever', 9.99, 'USD', 'lifetime', NULL),
('com.cybersimply.adfree.monthly', 'Ad-Free Monthly', 'Remove all ads for one month', 2.99, 'USD', 'subscription', 30),
('com.cybersimply.premium.monthly', 'Premium Monthly', 'Full premium features for one month', 4.99, 'USD', 'subscription', 30)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_iap_status_user_id ON user_iap_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_iap_status_product_id ON user_iap_status(product_id);
CREATE INDEX IF NOT EXISTS idx_user_iap_status_is_active ON user_iap_status(is_active);
CREATE INDEX IF NOT EXISTS idx_user_iap_status_expiration ON user_iap_status(expiration_date);

-- Enable RLS
ALTER TABLE user_iap_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE iap_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own IAP status" ON user_iap_status
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own IAP status" ON user_iap_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own IAP status" ON user_iap_status
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all IAP status" ON user_iap_status
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can read IAP products" ON iap_products
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage IAP products" ON iap_products
  FOR ALL USING (auth.role() = 'service_role');

-- Create trigger for updated_at
CREATE TRIGGER update_user_iap_status_updated_at 
  BEFORE UPDATE ON user_iap_status 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user has active ad-free access
CREATE OR REPLACE FUNCTION check_user_ad_free_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_iap_status 
    WHERE user_id = user_uuid 
      AND is_active = TRUE 
      AND (
        expiration_date IS NULL -- Lifetime purchase
        OR expiration_date > NOW() -- Active subscription
      )
      AND product_id IN (
        'com.cybersimply.adfree.lifetime',
        'com.cybersimply.adfree.monthly',
        'com.cybersimply.premium.monthly'
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user ad-free status based on IAP
CREATE OR REPLACE FUNCTION update_user_ad_free_status(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  has_ad_free BOOLEAN;
BEGIN
  -- Check if user has active ad-free access
  has_ad_free := check_user_ad_free_access(user_uuid);
  
  -- Update user profile
  UPDATE user_profiles 
  SET 
    ad_free = has_ad_free,
    is_premium = has_ad_free,
    updated_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for easy ad-free status checking
CREATE OR REPLACE VIEW user_ad_free_status AS
SELECT 
  up.id,
  up.email,
  up.ad_free,
  up.is_premium,
  up.premium_expires_at,
  uis.product_id,
  uis.purchase_date,
  uis.expiration_date,
  uis.is_active as iap_active,
  uis.apple_verification_status
FROM user_profiles up
LEFT JOIN user_iap_status uis ON up.id = uis.user_id 
  AND uis.is_active = TRUE
  AND (uis.expiration_date IS NULL OR uis.expiration_date > NOW());
