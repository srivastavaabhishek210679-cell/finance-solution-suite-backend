/**
 * Diagnostic Script - Check API Response Format
 */

const API_BASE = 'http://localhost:3002/api/v1';

async function diagnose() {
  console.log('🔍 Checking API response format...\n');
  
  try {
    console.log(`Calling: ${API_BASE}/reports?page=1&limit=10\n`);
    
    const response = await fetch(`${API_BASE}/reports?page=1&limit=10`);
    
    console.log(`✅ Response Status: ${response.status} ${response.statusText}\n`);
    
    const data = await response.json();
    
    console.log('📊 Full Response Structure:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(80));
    console.log('\n📋 Response Keys:', Object.keys(data));
    
    // Check different possible structures
    if (data.data) {
      console.log('\n✅ Found data.data');
      console.log(`   Type: ${Array.isArray(data.data) ? 'Array' : typeof data.data}`);
      if (Array.isArray(data.data)) {
        console.log(`   Length: ${data.data.length}`);
        if (data.data.length > 0) {
          console.log('\n📄 First Report Sample:');
          console.log(JSON.stringify(data.data[0], null, 2));
        }
      }
    } else if (data.reports) {
      console.log('\n✅ Found data.reports');
      console.log(`   Length: ${data.reports.length}`);
    } else if (Array.isArray(data)) {
      console.log('\n✅ Data is direct array');
      console.log(`   Length: ${data.length}`);
    } else {
      console.log('\n⚠️  Unknown structure!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

diagnose();
