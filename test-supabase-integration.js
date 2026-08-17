// Test script to verify Supabase integration
// Run this with: node test-supabase-integration.js

const { createClient } = require('@supabase/supabase-js');

// Using your actual Supabase credentials from supabaseConfig.ts
const supabaseUrl = 'https://uaykrxfhzfkhjwnmvukb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWtyeGZoemZraGp3bm12dWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjI1ODMsImV4cCI6MjA3MzA5ODU4M30.V4cd5JiLwAgjNUk-VTBicIp52PuH2FAp_UsZMRPlR40';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseIntegration() {
  console.log('🔍 Testing Supabase integration...');
  
  try {
    // Test 1: Query articles directly from Supabase
    console.log('\n📰 Test 1: Querying articles from Supabase...');
    const { data, error } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        source,
        published_at,
        summary,
        what,
        impact,
        takeaways,
        why_this_matters
      `)
      .order('published_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error querying articles:', error);
      return;
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} articles from Supabase`);
    
    if (data && data.length > 0) {
      console.log('\n📋 Sample articles:');
      data.forEach((article, index) => {
        console.log(`\n${index + 1}. ${article.title}`);
        console.log(`   Source: ${article.source}`);
        console.log(`   Published: ${article.published_at}`);
        console.log(`   Has Summary: ${!!article.summary}`);
        console.log(`   Has AI Fields: ${!!article.what && !!article.impact && !!article.takeaways && !!article.why_this_matters}`);
      });
    } else {
      console.log('⚠️ No articles found in Supabase database');
    }

    // Test 2: Check for articles with null AI fields
    console.log('\n🤖 Test 2: Checking AI field population...');
    const { data: aiData, error: aiError } = await supabase
      .from('articles')
      .select('id, title, what, impact, takeaways, why_this_matters')
      .limit(10);

    if (aiError) {
      console.error('❌ Error checking AI fields:', aiError);
      return;
    }

    if (aiData && aiData.length > 0) {
      const articlesWithAI = aiData.filter(article => 
        article.what && article.impact && article.takeaways && article.why_this_matters
      );
      
      console.log(`✅ ${articlesWithAI.length}/${aiData.length} articles have all AI fields populated`);
      
      const articlesWithSomeAI = aiData.filter(article => 
        article.what || article.impact || article.takeaways || article.why_this_matters
      );
      
      console.log(`📊 ${articlesWithSomeAI.length}/${aiData.length} articles have some AI fields populated`);
    }

    console.log('\n🎉 Supabase integration test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Run your React Native app');
    console.log('2. Check console logs for "DirectSupabaseService" messages');
    console.log('3. Verify articles displayed match what you see in Supabase');
    console.log('4. Test that null AI fields display fallback text');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSupabaseIntegration();
