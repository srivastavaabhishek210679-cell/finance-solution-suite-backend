/**
 * Route Discovery Script
 * Tests common API endpoint patterns to find the correct reports endpoint
 */

const possibleEndpoints = [
  'http://localhost:3002/api/v1/reports',
  'http://localhost:3002/api/reports',
  'http://localhost:3002/reports',
  'http://localhost:3002/v1/reports',
  'http://localhost:3002/api/v1/report',
  'http://localhost:3002/api/report',
  'http://localhost:3002/report',
];

async function tryEndpoint(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    return {
      url,
      status: response.status,
      statusText: response.statusText,
      success: response.ok,
      data
    };
  } catch (error) {
    return {
      url,
      error: error.message
    };
  }
}

async function discover() {
  console.log('🔍 Discovering API Routes...\n');
  console.log('='.repeat(80));
  
  for (const endpoint of possibleEndpoints) {
    console.log(`\nTrying: ${endpoint}`);
    const result = await tryEndpoint(endpoint);
    
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
    } else if (result.success) {
      console.log(`   ✅ SUCCESS! Status: ${result.status}`);
      console.log(`   📊 Response keys: ${Object.keys(result.data).join(', ')}`);
      
      if (result.data.data || result.data.reports || Array.isArray(result.data)) {
        console.log(`\n   🎯 FOUND IT! This is the correct endpoint!`);
        console.log(`   \n   Full Response Structure:`);
        console.log(JSON.stringify(result.data, null, 2));
        break;
      }
    } else {
      console.log(`   ⚠️  ${result.status} - ${result.statusText}`);
      if (result.data.message) {
        console.log(`   Message: ${result.data.message}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 If none of these worked, check your backend routes:');
  console.log('   Look in: C:\\finance-solution-suite\\deemona-api\\src\\routes\n');
}

discover();
