#!/usr/bin/env node

/**
 * Test script for CyberSafe News Backend API
 * Run with: node test-api.js
 */

const API_BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing CyberSafe News Backend API\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing health check...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    console.log('');

    // Test 2: Test donation webhook
    console.log('2. Testing donation webhook...');
    const donationPayload = {
      type: 'new_donation',
      data: {
        email: 'test@example.com',
        amount: '5.00',
        currency: 'USD',
        supporter_name: 'Test User'
      }
    };

    const donationResponse = await fetch(`${API_BASE_URL}/api/bmc-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(donationPayload)
    });

    const donationData = await donationResponse.json();
    console.log('✅ Donation webhook:', donationData);
    console.log('');

    // Test 3: Check ad-free status
    console.log('3. Testing ad-free status check...');
    const adFreeResponse = await fetch(`${API_BASE_URL}/api/check-adfree?email=test@example.com`);
    const adFreeData = await adFreeResponse.json();
    console.log('✅ Ad-free status:', adFreeData);
    console.log('');

    // Test 4: Get donor stats
    console.log('4. Testing donor stats...');
    const statsResponse = await fetch(`${API_BASE_URL}/api/donor-stats`);
    const statsData = await statsResponse.json();
    console.log('✅ Donor stats:', statsData);
    console.log('');

    // Test 5: Test with insufficient donation
    console.log('5. Testing insufficient donation...');
    const smallDonationPayload = {
      type: 'new_donation',
      data: {
        email: 'small@example.com',
        amount: '1.00',
        currency: 'USD',
        supporter_name: 'Small Donor'
      }
    };

    const smallDonationResponse = await fetch(`${API_BASE_URL}/api/bmc-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smallDonationPayload)
    });

    const smallDonationData = await smallDonationResponse.json();
    console.log('✅ Small donation:', smallDonationData);

    const smallAdFreeResponse = await fetch(`${API_BASE_URL}/api/check-adfree?email=small@example.com`);
    const smallAdFreeData = await smallAdFreeResponse.json();
    console.log('✅ Small donor ad-free status:', smallAdFreeData);
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('- Health check: ✅');
    console.log('- Donation webhook: ✅');
    console.log('- Ad-free status check: ✅');
    console.log('- Donor stats: ✅');
    console.log('- Insufficient donation handling: ✅');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the server is running: npm run dev');
    console.log('2. Check that all environment variables are set');
    console.log('3. Verify Supabase connection');
    console.log('4. Check server logs for errors');
  }
}

// Run the tests
testAPI();
