-- =============================================
-- CyberSimply Supabase Database Schema
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- USERS & AUTHENTICATION
-- =============================================

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  ad_free BOOLEAN DEFAULT FALSE, -- TRUE only after verified purchase
  product_type TEXT, -- 'lifetime' or 'subscription'
  purchase_date TIMESTAMP WITH TIME ZONE,
  last_purchase_date TIMESTAMP WITH TIME ZONE,
  premium_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- DONATIONS & MONETIZATION
-- =============================================

-- Donors table for Buy Me a Coffee integration
CREATE TABLE IF NOT EXISTS donors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  total_donated NUMERIC(10,2) DEFAULT 0.00,
  isAdFree BOOLEAN DEFAULT FALSE,
  supporter_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ARTICLES & CONTENT
-- =============================================

-- Articles table for caching and storage
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  source_url TEXT,
  source TEXT,
  author TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  category TEXT,
  what TEXT,
  impact TEXT,
  takeaways TEXT,
  why_this_matters TEXT,
  ai_summary_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Article categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#007AFF',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- USER INTERACTIONS
-- =============================================

-- User favorites
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- User reading history
CREATE TABLE IF NOT EXISTS reading_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_spent INTEGER DEFAULT 0, -- in seconds
  UNIQUE(user_id, article_id)
);

-- User search history
CREATE TABLE IF NOT EXISTS search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- USER PREFERENCES & SETTINGS
-- =============================================

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  theme TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_digest_enabled BOOLEAN DEFAULT TRUE,
  digest_frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  preferred_categories TEXT[] DEFAULT ARRAY['cybersecurity', 'hacking', 'general'],
  ai_summaries_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ANALYTICS & TRACKING
-- =============================================

-- App usage analytics
CREATE TABLE IF NOT EXISTS usage_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'article_view', 'search', 'favorite', 'share', etc.
  event_data JSONB,
  session_id TEXT,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Article performance metrics
CREATE TABLE IF NOT EXISTS article_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  avg_read_time INTEGER DEFAULT 0, -- in seconds
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- NOTIFICATIONS
-- =============================================

-- Push notification tokens
CREATE TABLE IF NOT EXISTS notification_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'ios', 'android', 'web'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  breaking_news BOOLEAN DEFAULT TRUE,
  daily_digest BOOLEAN DEFAULT TRUE,
  weekly_roundup BOOLEAN DEFAULT TRUE,
  security_alerts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_premium ON user_profiles(is_premium);

-- Donors indexes
CREATE INDEX IF NOT EXISTS idx_donors_email ON donors(email);
CREATE INDEX IF NOT EXISTS idx_donors_isAdFree ON donors(isAdFree);

-- Articles indexes
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- User interactions indexes
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_article_id ON user_favorites(article_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_article_id ON reading_history(article_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_id ON usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_event_type ON usage_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_created_at ON usage_analytics(created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Donors policies
CREATE POLICY "Service role can access all donor data" ON donors
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can check their own ad-free status" ON donors
  FOR SELECT USING (true);

-- Articles policies (public read access)
CREATE POLICY "Anyone can read articles" ON articles
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage articles" ON articles
  FOR ALL USING (auth.role() = 'service_role');

-- Categories policies (public read access)
CREATE POLICY "Anyone can read categories" ON categories
  FOR SELECT USING (true);

-- User favorites policies
CREATE POLICY "Users can manage their own favorites" ON user_favorites
  FOR ALL USING (auth.uid() = user_id);

-- Reading history policies
CREATE POLICY "Users can manage their own reading history" ON reading_history
  FOR ALL USING (auth.uid() = user_id);

-- Search history policies
CREATE POLICY "Users can manage their own search history" ON search_history
  FOR ALL USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Usage analytics policies
CREATE POLICY "Users can insert their own analytics" ON usage_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can read all analytics" ON usage_analytics
  FOR SELECT USING (auth.role() = 'service_role');

-- Article metrics policies (public read, service write)
CREATE POLICY "Anyone can read article metrics" ON article_metrics
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage article metrics" ON article_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- Notification tokens policies
CREATE POLICY "Users can manage their own notification tokens" ON notification_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donors_updated_at 
  BEFORE UPDATE ON donors 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at 
  BEFORE UPDATE ON articles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_tokens_updated_at 
  BEFORE UPDATE ON notification_tokens 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
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

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert default categories
INSERT INTO categories (name, display_name, description, color) VALUES
('cybersecurity', 'Cybersecurity', 'General cybersecurity news and updates', '#007AFF'),
('hacking', 'Hacking', 'Hacking incidents and security breaches', '#FF3B30'),
('general', 'General', 'General technology and security news', '#34C759'),
('privacy', 'Privacy', 'Privacy-related news and updates', '#AF52DE'),
('scams', 'Scams', 'Scam alerts and fraud prevention', '#FF9500')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for article details with metrics
CREATE OR REPLACE VIEW article_details AS
SELECT 
  a.*,
  COALESCE(am.views, 0) as view_count,
  COALESCE(am.favorites, 0) as favorite_count,
  COALESCE(am.shares, 0) as share_count,
  COALESCE(am.avg_read_time, 0) as avg_read_time
FROM articles a
LEFT JOIN article_metrics am ON a.id = am.article_id;

-- View for user dashboard data
CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
  up.*,
  upf.theme,
  upf.notifications_enabled,
  upf.preferred_categories,
  COUNT(DISTINCT uf.article_id) as favorite_count,
  COUNT(DISTINCT rh.article_id) as read_count
FROM user_profiles up
LEFT JOIN user_preferences upf ON up.id = upf.user_id
LEFT JOIN user_favorites uf ON up.id = uf.user_id
LEFT JOIN reading_history rh ON up.id = rh.user_id
GROUP BY up.id, upf.theme, upf.notifications_enabled, upf.preferred_categories;