-- Create articles table for CyberSimply app
-- This table stores news articles fetched from NewsAPI and enriched with AI summaries

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  source_url TEXT,
  source TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  image_url TEXT,
  category TEXT CHECK (category IN ('cybersecurity', 'hacking', 'general')),
  what TEXT,
  impact TEXT,
  takeaways TEXT,
  why_this_matters TEXT,
  ai_summary_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_ai_summary_generated ON articles(ai_summary_generated);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_articles_updated_at ON articles;
CREATE TRIGGER trigger_update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_articles_updated_at();

-- Create article_metrics table for tracking views, favorites, etc.
CREATE TABLE IF NOT EXISTS article_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  avg_read_time INTEGER DEFAULT 0, -- in seconds
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id)
);

-- Create indexes for article_metrics
CREATE INDEX IF NOT EXISTS idx_article_metrics_article_id ON article_metrics(article_id);
CREATE INDEX IF NOT EXISTS idx_article_metrics_views ON article_metrics(views DESC);
CREATE INDEX IF NOT EXISTS idx_article_metrics_favorites ON article_metrics(favorites DESC);

-- Create a view for article details with metrics
CREATE OR REPLACE VIEW article_details AS
SELECT 
  a.*,
  COALESCE(am.views, 0) as view_count,
  COALESCE(am.favorites, 0) as favorite_count,
  COALESCE(am.shares, 0) as share_count,
  COALESCE(am.avg_read_time, 0) as avg_read_time
FROM articles a
LEFT JOIN article_metrics am ON a.id = am.article_id;

-- Enable Row Level Security (RLS)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to articles
CREATE POLICY "Articles are publicly readable" ON articles
  FOR SELECT USING (true);

CREATE POLICY "Article metrics are publicly readable" ON article_metrics
  FOR SELECT USING (true);

-- Create policies for authenticated users to insert/update metrics
CREATE POLICY "Authenticated users can insert article metrics" ON article_metrics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update article metrics" ON article_metrics
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Insert some sample articles for testing
INSERT INTO articles (id, title, summary, source, author, published_at, image_url, category, what, impact, takeaways, why_this_matters, ai_summary_generated) VALUES
(
  'sample-article-1',
  'Cybersecurity Best Practices for 2024',
  'Essential security tips to protect your digital life in the new year.',
  'CyberSimply',
  'Security Expert',
  NOW() - INTERVAL '1 hour',
  'https://via.placeholder.com/400x200/2196F3/ffffff?text=Cybersecurity+Best+Practices',
  'cybersecurity',
  'This article covers the latest cybersecurity best practices including password management, two-factor authentication, and software updates.',
  'Implementing these practices can significantly reduce the risk of cyber attacks and data breaches.',
  'Key takeaways include using strong passwords, enabling 2FA, keeping software updated, and being cautious with email attachments.',
  'With cyber threats constantly evolving, staying informed about security best practices is crucial for protecting personal and business data.',
  true
),
(
  'sample-article-2',
  'How to Protect Your Personal Data Online',
  'Simple steps to safeguard your personal information from cyber threats.',
  'CyberSimply',
  'Privacy Advocate',
  NOW() - INTERVAL '2 hours',
  'https://via.placeholder.com/400x200/4CAF50/ffffff?text=Protect+Personal+Data',
  'cybersecurity',
  'This guide explains how to protect personal data through privacy settings, secure browsing, and data minimization.',
  'Proper data protection helps prevent identity theft and maintains privacy in an increasingly connected world.',
  'Important steps include reviewing privacy settings, using VPNs, limiting data sharing, and being selective about app permissions.',
  'Personal data is valuable to cybercriminals and companies alike, making protection essential for privacy and security.',
  true
),
(
  'sample-article-3',
  'Understanding Phishing Attacks',
  'Learn how to identify and avoid phishing attempts that target your accounts.',
  'CyberSimply',
  'Security Analyst',
  NOW() - INTERVAL '3 hours',
  'https://via.placeholder.com/400x200/FF9800/ffffff?text=Phishing+Attacks',
  'hacking',
  'This article explains different types of phishing attacks and how to recognize them.',
  'Phishing attacks are a leading cause of data breaches and can result in financial loss and identity theft.',
  'Red flags include urgent requests, suspicious links, poor grammar, and requests for sensitive information.',
  'Phishing attacks are becoming more sophisticated, making awareness and education crucial for protection.',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample metrics for the articles
INSERT INTO article_metrics (article_id, views, favorites, shares, avg_read_time) VALUES
('sample-article-1', 150, 25, 8, 180),
('sample-article-2', 200, 30, 12, 240),
('sample-article-3', 120, 18, 6, 160)
ON CONFLICT (article_id) DO NOTHING;
