/**
 * Check /reports/master response structure
 */

async function checkMasterEndpoint() {
  console.log('🔍 Checking /api/v1/reports/master endpoint...\n');
  
  try {
    const url = 'http://localhost:3002/api/v1/reports/master?page=1&limit=10';
    console.log(`Calling: ${url}\n`);
    
    const response = await fetch(url);
    
    console.log(`Status: ${response.status} ${response.statusText}\n`);
    
    const data = await response.json();
    
    console.log('📊 FULL RESPONSE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(80));
    
    console.log('\n📋 Top-level keys:', Object.keys(data));
    
    // Check where reports array is
    if (data.data) {
      console.log('\n✅ Found: data.data');
      console.log('   Type:', typeof data.data);
      if (Array.isArray(data.data)) {
        console.log('   ✅ It\'s an array!');
        console.log('   Length:', data.data.length);
      } else {
        console.log('   Keys in data.data:', Object.keys(data.data));
      }
    }
    
    if (data.reports) {
      console.log('\n✅ Found: data.reports');
      console.log('   Length:', data.reports.length);
    }
    
    if (Array.isArray(data)) {
      console.log('\n✅ Response is a direct array');
      console.log('   Length:', data.length);
    }
    
    // Check for pagination structure
    if (data.pagination || data.meta || data.pageInfo) {
      console.log('\n📄 Pagination info found:', data.pagination || data.meta || data.pageInfo);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nStack:', error.stack);
  }
}

checkMasterEndpoint();
