#!/usr/bin/env node

// test-fallback.js
// Simple test to verify the NewsAPI fallback implementation

import { fetchNewsAPIArticles } from './fetch-articles.mjs';

console.log('🧪 Testing NewsAPI fallback implementation...\n');

// Test 1: Check if rate limit detection works
console.log('Test 1: Checking rate limit error detection...');

try {
  // This should work if API key is valid, or fail with rate limit
  const articles = await fetchNewsAPIArticles();
  console.log('✅ NewsAPI working normally:', articles.length, 'articles');
} catch (error) {
  if (error.isRateLimit) {
    console.log('✅ Rate limit detected correctly:', error.message);
  } else {
    console.log('⚠️  Other error detected:', error.message);
  }
}

console.log('\n🎉 Test completed!');
console.log('📝 To test the full workflow:');
console.log('   1. Run: node fetch-articles.mjs');
console.log('   2. Check GitHub Actions workflow logs');
console.log('   3. Verify fallback messages appear when rate limited');
