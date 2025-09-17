// Supabase Edge Function to automatically fetch articles from NewsAPI
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const newsApiKey = Deno.env.get('NEWS_API_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// NewsAPI configuration
const NEWS_API_BASE_URL = 'https://newsapi.org/v2/everything';
const SEARCH_QUERIES = {
  cybersecurity: 'cybersecurity OR "cyber security" OR "data breach" OR "security vulnerability"',
  hacking: 'hacking OR "cyber attack" OR "malware" OR "ransomware" OR "phishing"',
  general: 'technology security OR "privacy protection" OR "online safety"'
};

interface NewsApiArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

// Generate UUID (simple implementation)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

serve(async (req) => {
  try {
    console.log('🔄 Starting automatic article fetch...');
    
    if (!newsApiKey || newsApiKey === 'YOUR_NEWS_API_KEY') {
      throw new Error('NewsAPI key not configured');
    }
    
    const allArticles = [];
    
    // Fetch articles for each category
    for (const [category, query] of Object.entries(SEARCH_QUERIES)) {
      try {
        console.log(`📰 Fetching ${category} articles...`);
        
        const url = `${NEWS_API_BASE_URL}?q=${encodeURIComponent(query)}&apiKey=${newsApiKey}&pageSize=3&sortBy=publishedAt&language=en`;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`❌ NewsAPI error for ${category}: ${response.status}`);
          continue;
        }
        
        const data: NewsApiResponse = await response.json();
        
        if (data.status === 'ok' && data.articles) {
          const articles = data.articles.map((article) => ({
            id: generateUUID(),
            title: article.title,
            summary: article.description || '',
            source_url: article.url,
            source: article.source.name,
            author: article.author,
            published_at: article.publishedAt,
            image_url: article.urlToImage,
            category: category,
            what: '',
            impact: '',
            takeaways: '',
            why_this_matters: '',
            ai_summary_generated: false
          }));
          
          allArticles.push(...articles);
          console.log(`✅ Fetched ${articles.length} ${category} articles`);
        }
      } catch (error) {
        console.error(`❌ Error fetching ${category} articles:`, error);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (allArticles.length === 0) {
      throw new Error('No articles fetched from NewsAPI');
    }
    
    // Store articles in Supabase
    console.log(`💾 Storing ${allArticles.length} articles in Supabase...`);
    
    const { data: storedArticles, error } = await supabase
      .from('articles')
      .upsert(allArticles, { onConflict: 'id' });
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Successfully stored ${allArticles.length} articles`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully fetched and stored ${allArticles.length} articles`,
        articlesCount: allArticles.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('❌ Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});