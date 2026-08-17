# Supabase Setup for CyberSimply

This guide will help you set up Supabase for the CyberSimply app with automatic article fetching and AI processing.

## 1. Environment Variables

Add these environment variables to your Supabase project:

### In Supabase Dashboard → Settings → Edge Functions → Environment Variables:

```
NEWS_API_KEY=your_newsapi_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## 2. Database Schema

Run this SQL in your Supabase SQL Editor:

```sql
-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  source_url TEXT UNIQUE NOT NULL,
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

-- Create article metrics table
CREATE TABLE IF NOT EXISTS article_metrics (
  article_id UUID PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  avg_read_time INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, description) VALUES
  ('cybersecurity', 'General cybersecurity news and updates'),
  ('hacking', 'Hacking incidents and security breaches'),
  ('general', 'General technology security news')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source_url ON articles(source_url);

-- Create view for article details with metrics
CREATE OR REPLACE VIEW article_details AS
SELECT 
  a.*,
  am.views,
  am.favorites,
  am.shares,
  am.avg_read_time
FROM articles a
LEFT JOIN article_metrics am ON a.id = am.article_id;

-- Enable Row Level Security (RLS)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Articles are publicly readable" ON articles FOR SELECT USING (true);
CREATE POLICY "Article metrics are publicly readable" ON article_metrics FOR SELECT USING (true);
CREATE POLICY "Categories are publicly readable" ON categories FOR SELECT USING (true);

-- Create policy for article metrics updates (for authenticated users)
CREATE POLICY "Authenticated users can update article metrics" ON article_metrics 
  FOR ALL USING (auth.role() = 'authenticated');
```

## 3. Deploy Edge Function

Deploy the fetchArticles Edge Function:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy fetchArticles
```

## 4. Set up Cron Job

The Edge Function will automatically run every 15 minutes to fetch and process new articles.

You can also manually trigger it:

```bash
# Test the function locally
supabase functions serve fetchArticles

# Deploy and test
supabase functions deploy fetchArticles --no-verify-jwt
```

## 5. Test the Setup

1. Check that articles are being fetched by visiting your Supabase dashboard
2. Verify the articles table is populated
3. Check that AI summaries are being generated
4. Test the app to ensure it's pulling from Supabase

## 6. Monitoring

Monitor the Edge Function logs in the Supabase dashboard:
- Go to Edge Functions → fetchArticles → Logs
- Check for any errors or issues
- Verify articles are being processed correctly

## 7. Customization

You can customize the article fetching by modifying:
- Search queries in the Edge Function
- AI prompt for article summarization
- Cron schedule (currently every 15 minutes)
- Number of articles fetched per run

## Troubleshooting

### Common Issues:

1. **No articles being fetched**: Check NewsAPI key and rate limits
2. **AI summaries not working**: Verify OpenAI API key and credits
3. **Database errors**: Check table permissions and RLS policies
4. **Function not running**: Verify cron job is enabled and function is deployed

### Debug Commands:

```bash
# Check function logs
supabase functions logs fetchArticles

# Test function locally
supabase functions serve fetchArticles --no-verify-jwt

# Check database connection
supabase db ping
```
