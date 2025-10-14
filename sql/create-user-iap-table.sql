-- =============================================
-- User IAP Table for StoreKit 2 Integration
-- =============================================
-- This table tracks all in-app purchases with verified transaction data
-- Updated automatically via App Store Server Notifications v2

CREATE TABLE IF NOT EXISTS user_iap (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- User identification
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Transaction details from StoreKit 2
  transaction_id TEXT UNIQUE NOT NULL, -- Original transaction ID from Apple
  original_transaction_id TEXT, -- For subscription renewals
  product_id TEXT NOT NULL, -- e.g., com.cybersimply.adfree.lifetime
  
  -- Purchase metadata
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
  original_purchase_date TIMESTAMP WITH TIME ZONE,
  expires_date TIMESTAMP WITH TIME ZONE, -- NULL for non-consumables
  
  -- Status tracking
  is_active BOOLEAN DEFAULT TRUE,
  environment TEXT DEFAULT 'production', -- 'production' or 'sandbox'
  
  -- Apple verification data
  receipt_data TEXT, -- Base64 encoded receipt (optional, for legacy)
  
  -- Server notification tracking
  last_notification_type TEXT, -- e.g., 'INITIAL_BUY', 'DID_RENEW', 'DID_FAIL_TO_RENEW'
  last_notification_date TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_user_iap_user_id ON user_iap(user_id);
CREATE INDEX IF NOT EXISTS idx_user_iap_transaction_id ON user_iap(transaction_id);
CREATE INDEX IF NOT EXISTS idx_user_iap_product_id ON user_iap(product_id);
CREATE INDEX IF NOT EXISTS idx_user_iap_is_active ON user_iap(is_active);
CREATE INDEX IF NOT EXISTS idx_user_iap_expires_date ON user_iap(expires_date);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE user_iap ENABLE ROW LEVEL SECURITY;

-- Users can read their own IAP records
CREATE POLICY "Users can view their own purchases" ON user_iap
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all IAP records (for webhook updates)
CREATE POLICY "Service role can manage all purchases" ON user_iap
  FOR ALL USING (auth.role() = 'service_role');

-- Authenticated users can insert their own purchases (from app)
CREATE POLICY "Users can insert their own purchases" ON user_iap
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
DROP TRIGGER IF EXISTS update_user_iap_updated_at ON user_iap;
CREATE TRIGGER update_user_iap_updated_at 
  BEFORE UPDATE ON user_iap 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTION: Sync ad-free status from user_iap
-- =============================================
-- This function updates user_profiles.ad_free based on active purchases

CREATE OR REPLACE FUNCTION sync_adfree_status_from_iap()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user has any active ad-free purchases
  UPDATE user_profiles
  SET 
    ad_free = EXISTS (
      SELECT 1 FROM user_iap
      WHERE user_id = NEW.user_id
        AND is_active = TRUE
        AND (expires_date IS NULL OR expires_date > NOW())
    ),
    is_premium = EXISTS (
      SELECT 1 FROM user_iap
      WHERE user_id = NEW.user_id
        AND is_active = TRUE
        AND (expires_date IS NULL OR expires_date > NOW())
    ),
    premium_expires_at = (
      SELECT MAX(expires_date) FROM user_iap
      WHERE user_id = NEW.user_id
        AND is_active = TRUE
        AND expires_date IS NOT NULL
    ),
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync ad-free status when user_iap changes
CREATE TRIGGER sync_adfree_on_iap_insert
  AFTER INSERT ON user_iap
  FOR EACH ROW
  EXECUTE FUNCTION sync_adfree_status_from_iap();

CREATE TRIGGER sync_adfree_on_iap_update
  AFTER UPDATE ON user_iap
  FOR EACH ROW
  EXECUTE FUNCTION sync_adfree_status_from_iap();

-- =============================================
-- HELPER FUNCTION: Check active ad-free status
-- =============================================

CREATE OR REPLACE FUNCTION has_active_adfree_purchase(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_iap
    WHERE user_id = p_user_id
      AND is_active = TRUE
      AND (expires_date IS NULL OR expires_date > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HELPER FUNCTION: Get user's active purchases
-- =============================================

CREATE OR REPLACE FUNCTION get_user_active_purchases(p_user_id UUID)
RETURNS TABLE (
  transaction_id TEXT,
  product_id TEXT,
  purchase_date TIMESTAMP WITH TIME ZONE,
  expires_date TIMESTAMP WITH TIME ZONE,
  is_subscription BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.transaction_id,
    ui.product_id,
    ui.purchase_date,
    ui.expires_date,
    (ui.expires_date IS NOT NULL) as is_subscription
  FROM user_iap ui
  WHERE ui.user_id = p_user_id
    AND ui.is_active = TRUE
    AND (ui.expires_date IS NULL OR ui.expires_date > NOW())
  ORDER BY ui.purchase_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE user_iap IS 'Tracks all in-app purchases with verified Apple transaction data';
COMMENT ON COLUMN user_iap.transaction_id IS 'Unique transaction ID from Apple (immutable)';
COMMENT ON COLUMN user_iap.is_active IS 'False if refunded, expired, or cancelled';
COMMENT ON COLUMN user_iap.expires_date IS 'NULL for lifetime purchases, future date for subscriptions';
COMMENT ON COLUMN user_iap.last_notification_type IS 'Most recent App Store Server Notification type';
