// Enhanced script to fetch articles from multiple categories
// Run this with: node fetch-more-articles.js

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Use environment variables for credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const newsApiKey = process.env.NEWS_API_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseKey || !supabaseServiceKey || !newsApiKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('  - SUPABASE_URL');
  if (!supabaseKey) console.error('  - SUPABASE_ANON_KEY');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  if (!newsApiKey) console.error('  - NEWS_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Different search queries for different categories
const searchQueries = {
  cybersecurity: 'cybersecurity OR "cyber security" OR "data breach" OR "security vulnerability"',
  hacking: 'hacking OR "cyber attack" OR "malware" OR "ransomware" OR "phishing"',
  general: 'technology security OR "privacy protection" OR "online safety"'
};

async function fetchArticlesForCategory(category, query) {
  try {
    console.log(`🔄 Fetching ${category} articles from NewsAPI...`);
    
    const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${newsApiKey}&pageSize=5&sortBy=publishedAt&language=en`);
    const data = await response.json();
    
    if (data.status !== 'ok') {
      throw new Error(`NewsAPI error: ${data.status} - ${data.message || 'Unknown error'}`);
    }
    
    console.log(`✅ Fetched ${data.articles.length} ${category} articles from NewsAPI`);
    
    // Log raw data from NewsAPI
    console.log(`📰 Raw ${category} articles from NewsAPI:`, JSON.stringify(data.articles, null, 2));
    
    // Convert to our format
    const articles = data.articles.map((article, index) => ({
      id: crypto.randomUUID(),
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
    
    // Log converted articles format
    console.log(`🔄 Converted ${category} articles to internal format:`, JSON.stringify(articles, null, 2));
    
    return articles;
  } catch (error) {
    console.error(`❌ Error fetching ${category} articles:`, error.message);
    return [];
  }
}

async function fetchAndStoreAllArticles() {
  try {
    console.log('🚀 Starting comprehensive article fetch...');
    
    let allArticles = [];
    
    // Fetch articles for each category
    for (const [category, query] of Object.entries(searchQueries)) {
      const articles = await fetchArticlesForCategory(category, query);
        allArticles = allArticles.concat(articles);
      
      // Small delay between requests to be respectful to NewsAPI
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (allArticles.length === 0) {
      throw new Error('No articles fetched from any category');
    }
    
    console.log(`💾 Storing ${allArticles.length} total articles in Supabase...`);
    
    // Log what was fetched before inserting
    console.log("📰 Articles fetched:", JSON.stringify(allArticles, null, 2));
    
    // Store all articles in Supabase
    const { data: storedArticles, error } = await supabaseAdmin
      .from('articles')
      .upsert(allArticles, { onConflict: 'id' });
    
    if (error) {
      console.error("❌ Failed to insert articles:", error);
      throw error;
    } else {
      console.log("✅ Inserted articles into Supabase:", storedArticles?.length || allArticles.length);
    }
    
    console.log(`✅ Successfully stored ${allArticles.length} articles in Supabase`);
    
    // Show breakdown by category
    const categoryCounts = {};
    allArticles.forEach(article => {
      categoryCounts[article.category] = (categoryCounts[article.category] || 0) + 1;
    });
    
    console.log('\n📊 Articles by category:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count} articles`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the function
fetchAndStoreAllArticles();
