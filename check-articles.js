// Script to check how many articles are in the database
// Run this with: node check-articles.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uaykrxfhzfkhjwnmvukb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWtyeGZoemZraGp3bm12dWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjI1ODMsImV4cCI6MjA3MzA5ODU4M30.V4cd5JiLwAgjNUk-VTBicIp52PuH2FAp_UsZMRPlR40';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkArticles() {
  try {
    console.log('🔍 Checking articles in database...');
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw countError;
    }
    
    console.log(`📊 Total articles in database: ${count}`);
    
    // Get articles by category
    const { data: articles, error } = await supabase
      .from('articles')
      .select('category, title, published_at')
      .order('published_at', { ascending: false })
      .limit(20);
    
    if (error) {
      throw error;
    }
    
    console.log('\n📰 Recent articles:');
    articles.forEach((article, index) => {
      const date = new Date(article.published_at).toLocaleDateString();
      console.log(`${index + 1}. [${article.category}] ${article.title} (${date})`);
    });
    
    // Get category breakdown
    const categoryCounts = {};
    articles.forEach(article => {
      categoryCounts[article.category] = (categoryCounts[article.category] || 0) + 1;
    });
    
    console.log('\n📊 Category breakdown:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count} articles`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkArticles();
