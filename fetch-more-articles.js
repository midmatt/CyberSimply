// Enhanced script to fetch articles from multiple categories
// Run this with: node fetch-more-articles.js

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Replace with your actual Supabase credentials
const supabaseUrl = 'https://uaykrxfhzfkhjwnmvukb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWtyeGZoemZraGp3bm12dWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjI1ODMsImV4cCI6MjA3MzA5ODU4M30.V4cd5JiLwAgjNUk-VTBicIp52PuH2FAp_UsZMRPlR40';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWtyeGZoemZraGp3bm12dWtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUyMjU4MywiZXhwIjoyMDczMDk4NTgzfQ.b83X-KvDkcWyt1i_nXWvaIb2YNxwD3Gk_rKguWzJTyo';
const newsApiKey = '1a0a46cb62734a659f16de10fe6deb43';

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
    
    // Convert to our format
    const articles = data.articles.map((article, index) => ({
      id: uuidv4(),
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
    
    // Store all articles in Supabase
    const { data: storedArticles, error } = await supabaseAdmin
      .from('articles')
      .upsert(allArticles, { onConflict: 'id' });
    
    if (error) {
      throw error;
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
