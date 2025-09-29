#!/usr/bin/env node

/**
 * TestFlight Diagnostics Script
 * This script helps diagnose Supabase connectivity and data issues in TestFlight builds
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://uaykrxfhzfkhjwnmvukb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWtyeGZoemZraGp3bm12dWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjI1ODMsImV4cCI6MjA3MzA5ODU4M30.V4cd5JiLwAgjNUk-VTBicIp52PuH2FAp_UsZMRPlR40';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runDiagnostics() {
  console.log('🔍 TestFlight Diagnostics Starting...\n');
  
  try {
    // 1. Test basic connection
    console.log('1. Testing Supabase connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('articles')
      .select('id')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Connection failed:', connectionError);
      return;
    }
    console.log('✅ Connection successful\n');
    
    // 2. Check table structure
    console.log('2. Checking table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('articles')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table structure check failed:', tableError);
      return;
    }
    
    if (tableInfo && tableInfo.length > 0) {
      const sampleArticle = tableInfo[0];
      console.log('✅ Table structure check passed');
      console.log('📋 Available columns:', Object.keys(sampleArticle));
      console.log('🔗 Has redirect_url:', 'redirect_url' in sampleArticle);
      console.log('📂 Has category:', 'category' in sampleArticle);
      console.log('📄 Sample article:', {
        id: sampleArticle.id,
        title: sampleArticle.title,
        category: sampleArticle.category,
        redirect_url: sampleArticle.redirect_url
      });
    } else {
      console.log('⚠️  Table is empty');
    }
    console.log('');
    
    // 3. Check total article count
    console.log('3. Checking article count...');
    const { count: totalCount, error: countError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Count query failed:', countError);
      return;
    }
    
    console.log(`📊 Total articles: ${totalCount || 0}\n`);
    
    // 4. Check category distribution
    console.log('4. Checking category distribution...');
    const { data: categoryData, error: categoryError } = await supabase
      .from('articles')
      .select('category')
      .not('category', 'is', null);
    
    if (categoryError) {
      console.error('❌ Category query failed:', categoryError);
      return;
    }
    
    const categoryCounts = {};
    categoryData?.forEach(article => {
      const category = article.category || 'unknown';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    console.log('📈 Category distribution:', categoryCounts);
    console.log('');
    
    // 5. Check redirect_url availability
    console.log('5. Checking redirect_url availability...');
    const { data: redirectData, error: redirectError } = await supabase
      .from('articles')
      .select('id, title, redirect_url')
      .limit(10);
    
    if (redirectError) {
      console.error('❌ Redirect URL query failed:', redirectError);
      return;
    }
    
    const redirectStats = {
      total: redirectData?.length || 0,
      withRedirectUrl: redirectData?.filter(a => a.redirect_url).length || 0,
      withoutRedirectUrl: redirectData?.filter(a => !a.redirect_url).length || 0,
      nullRedirectUrl: redirectData?.filter(a => a.redirect_url === null).length || 0
    };
    
    console.log('🔗 Redirect URL stats:', redirectStats);
    console.log('');
    
    // 6. Test pagination query
    console.log('6. Testing pagination query...');
    const { data: paginationData, error: paginationError } = await supabase
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
        why_this_matters,
        redirect_url,
        category
      `)
      .order('published_at', { ascending: false })
      .limit(5);
    
    if (paginationError) {
      console.error('❌ Pagination query failed:', paginationError);
      return;
    }
    
    console.log(`✅ Pagination query successful - returned ${paginationData?.length || 0} articles`);
    if (paginationData && paginationData.length > 0) {
      console.log('📄 Sample paginated article:', {
        id: paginationData[0].id,
        title: paginationData[0].title,
        category: paginationData[0].category,
        redirect_url: paginationData[0].redirect_url,
        published_at: paginationData[0].published_at
      });
    }
    console.log('');
    
    // 7. Test category filtering
    console.log('7. Testing category filtering...');
    const categories = ['cybersecurity', 'hacking', 'general'];
    
    for (const category of categories) {
      const { data: categoryArticles, error: categoryQueryError } = await supabase
        .from('articles')
        .select('id, title, category')
        .eq('category', category)
        .limit(3);
      
      if (categoryQueryError) {
        console.error(`❌ Category query failed for ${category}:`, categoryQueryError);
        continue;
      }
      
      console.log(`📂 ${category}: ${categoryArticles?.length || 0} articles`);
      if (categoryArticles && categoryArticles.length > 0) {
        console.log(`   Sample: ${categoryArticles[0].title}`);
      }
    }
    console.log('');
    
    // 8. Check RLS policies
    console.log('8. Checking RLS policies...');
    const { data: rlsTest, error: rlsError } = await supabase
      .from('articles')
      .select('id, title, category, redirect_url')
      .limit(1);
    
    if (rlsError) {
      console.error('❌ RLS test failed:', rlsError);
      if (rlsError.code === 'PGRST301') {
        console.log('💡 This might be an RLS policy issue - check if anon key has SELECT permissions');
      }
    } else {
      console.log('✅ RLS policies allow anon access');
    }
    console.log('');
    
    console.log('🎉 TestFlight diagnostics completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Total articles: ${totalCount || 0}`);
    console.log(`- Categories: ${Object.keys(categoryCounts).join(', ')}`);
    console.log(`- Redirect URLs: ${redirectStats.withRedirectUrl}/${redirectStats.total} articles have redirect URLs`);
    console.log(`- RLS Access: ${rlsError ? 'Failed' : 'Working'}`);
    
  } catch (error) {
    console.error('💥 Diagnostics failed with error:', error);
  }
}

// Run diagnostics
runDiagnostics().catch(console.error);
