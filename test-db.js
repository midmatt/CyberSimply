const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection and article data...');
    
    // Get a sample of articles
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, summary, what, impact, takeaways, why_this_matters, ai_summary_generated')
      .limit(5);
    
    if (error) {
      console.error('❌ Error fetching articles:', error);
      return;
    }
    
    console.log(`✅ Found ${articles.length} articles`);
    
    articles.forEach((article, index) => {
      console.log(`\n📰 Article ${index + 1}: ${article.title}`);
      console.log(`   Summary: ${article.summary ? '✅' : '❌'} (${article.summary?.length || 0} chars)`);
      console.log(`   What: ${article.what ? '✅' : '❌'} (${article.what?.length || 0} chars)`);
      console.log(`   Impact: ${article.impact ? '✅' : '❌'} (${article.impact?.length || 0} chars)`);
      console.log(`   Takeaways: ${article.takeaways ? '✅' : '❌'} (${article.takeaways?.length || 0} chars)`);
      console.log(`   Why This Matters: ${article.why_this_matters ? '✅' : '❌'} (${article.why_this_matters?.length || 0} chars)`);
      console.log(`   AI Generated: ${article.ai_summary_generated ? '✅' : '❌'}`);
    });
    
    // Count articles with all AI fields
    const { data: completeArticles, error: countError } = await supabase
      .from('articles')
      .select('id')
      .not('what', 'is', null)
      .not('impact', 'is', null)
      .not('takeaways', 'is', null)
      .not('why_this_matters', 'is', null)
      .not('summary', 'is', null);
    
    if (countError) {
      console.error('❌ Error counting complete articles:', countError);
    } else {
      console.log(`\n📊 Articles with all AI fields: ${completeArticles.length}`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDatabase();
