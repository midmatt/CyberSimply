// Debug script to help identify loading issues
// Run this with: node debug-loading-issue.js

const { createClient } = require('@supabase/supabase-js');

// Using your actual Supabase credentials
const supabaseUrl = 'https://uaykrxfhzfkhjwnmvukb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWtyeGZoemZraGp3bm12dWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjI1ODMsImV4cCI6MjA3MzA5ODU4M30.V4cd5JiLwAgjNUk-VTBicIp52PuH2FAp_UsZMRPlR40';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLoadingIssue() {
  console.log('🔍 Debugging loading issue...');
  console.log('📱 App should be showing loading screen');
  console.log('🔧 Let\'s check what might be causing the issue\n');

  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('articles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection test failed:', testError);
      return;
    }
    console.log('✅ Basic connection works\n');

    // Test 2: Check if articles table exists and has data
    console.log('2️⃣ Checking articles table...');
    const { data: articles, error: articlesError, count } = await supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (articlesError) {
      console.error('❌ Articles table error:', articlesError);
      return;
    }
    
    console.log(`✅ Articles table accessible, total articles: ${count}`);
    
    if (count === 0) {
      console.log('⚠️ No articles found in database!');
      console.log('💡 This might be why the app is stuck on loading screen');
      console.log('🔧 Solutions:');
      console.log('   1. Run your GitHub Actions workflow to fetch articles');
      console.log('   2. Or manually run: node fetch-more-articles.js');
      console.log('   3. Or add some test articles to your database');
      return;
    }
    
    console.log(`✅ Found ${count} articles in database\n`);

    // Test 3: Check specific query that the app uses
    console.log('3️⃣ Testing the exact query the app uses...');
    const { data: appQuery, error: appError } = await supabase
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
      .limit(30);

    if (appError) {
      console.error('❌ App query failed:', appError);
      return;
    }

    console.log(`✅ App query successful, returned ${appQuery?.length || 0} articles`);
    
    if (appQuery && appQuery.length > 0) {
      console.log('📰 Sample article:');
      console.log(`   Title: ${appQuery[0].title}`);
      console.log(`   Source: ${appQuery[0].source}`);
      console.log(`   Published: ${appQuery[0].published_at}`);
      console.log(`   Has Summary: ${!!appQuery[0].summary}`);
      console.log(`   Has AI Fields: ${!!(appQuery[0].what && appQuery[0].impact && appQuery[0].takeaways && appQuery[0].why_this_matters)}`);
    }

    console.log('\n🎯 Diagnosis:');
    console.log('✅ Supabase connection: Working');
    console.log('✅ Articles table: Accessible');
    console.log('✅ Data available: Yes');
    console.log('✅ App query: Working');
    
    console.log('\n💡 Possible causes of loading screen issue:');
    console.log('1. Network connectivity issues on device');
    console.log('2. React Native app not properly initialized');
    console.log('3. AsyncStorage issues (local storage)');
    console.log('4. JavaScript errors in the app preventing rendering');
    console.log('5. Expo development server issues');
    
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check device/simulator console for JavaScript errors');
    console.log('2. Try refreshing the app (pull down to refresh)');
    console.log('3. Clear app cache and restart');
    console.log('4. Check network connection');
    console.log('5. Try running on a different device/simulator');

  } catch (error) {
    console.error('❌ Debug test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugLoadingIssue();
