// Simple script to fetch articles from NewsAPI and store in Supabase
// Run this with: node fetch-articles.js

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Replace with your actual Supabase credentials
const supabaseUrl = 'https://uaykrxfhzfkhjwnmvukb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWtyeGZoemZraGp3bm12dWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjI1ODMsImV4cCI6MjA3MzA5ODU4M30.V4cd5JiLwAgjNUk-VTBicIp52PuH2FAp_UsZMRPlR40'; // Get this from your Supabase dashboard
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWtyeGZoemZraGp3bm12dWtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUyMjU4MywiZXhwIjoyMDczMDk4NTgzfQ.b83X-KvDkcWyt1i_nXWvaIb2YNxwD3Gk_rKguWzJTyo'; // Service role key to bypass RLS
const newsApiKey = '1a0a46cb62734a659f16de10fe6deb43'; // Get this from newsapi.org

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fetchAndStoreArticles() {
  try {
    console.log('🔄 Fetching articles from NewsAPI...');
    console.log('📡 Using NewsAPI key:', newsApiKey.substring(0, 8) + '...');
    
    // Fetch from NewsAPI
    const response = await fetch(`https://newsapi.org/v2/everything?q=cybersecurity&apiKey=${newsApiKey}&pageSize=10&sortBy=publishedAt&language=en`);
    const data = await response.json();
    
    console.log('📊 NewsAPI response:', JSON.stringify(data, null, 2));
    
    if (data.status !== 'ok') {
      throw new Error(`NewsAPI error: ${data.status} - ${data.message || 'Unknown error'}`);
    }
    
    console.log(`✅ Fetched ${data.articles.length} articles from NewsAPI`);
    
    // Convert to our format and store in Supabase
    const articles = data.articles.map((article, index) => ({
      id: uuidv4(),
      title: article.title,
      summary: article.description || '',
      source_url: article.url,
      source: article.source.name,
      author: article.author,
      published_at: article.publishedAt,
      image_url: article.urlToImage,
      category: 'cybersecurity', // Default category
      what: '',
      impact: '',
      takeaways: '',
      why_this_matters: '',
      ai_summary_generated: false
    }));
    
    // Store in Supabase using admin client to bypass RLS
    const { data: storedArticles, error } = await supabaseAdmin
      .from('articles')
      .upsert(articles, { onConflict: 'id' });
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Successfully stored ${articles.length} articles in Supabase`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the function
fetchAndStoreArticles();
