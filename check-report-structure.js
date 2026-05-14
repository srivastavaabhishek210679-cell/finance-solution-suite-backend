/**
 * Diagnostic - Check Report Field Names
 */

const API_BASE = 'http://localhost:3002/api/v1';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE0LCJ0ZW5hbnRJZCI6MSwicm9sZUlkIjoxLCJlbWFpbCI6ImFsaWNlLnNtaXRoQGRlbW8uY29tIiwiaWF0IjoxNzc3OTU2OTExLCJleHAiOjE3NzgwNDMzMTF9.pg3SfEc7iV9oOywGDjnfnN-IRC84xiYju68rtSWI1ho';

const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
};

async function checkStructure() {
  console.log('🔍 Checking report structure...\n');
  
  try {
    const response = await fetch(`${API_BASE}/reports/master?page=1&limit=5`, {
      headers
    });
    
    const data = await response.json();
    
    console.log('📊 API Response Structure:');
    console.log('Top-level keys:', Object.keys(data), '\n');
    
    const reports = data.data || data.reports || data;
    
    if (Array.isArray(reports) && reports.length > 0) {
      console.log('✅ Found reports array\n');
      console.log('📄 First Report Structure:');
      console.log('='.repeat(80));
      console.log(JSON.stringify(reports[0], null, 2));
      console.log('='.repeat(80));
      console.log('\n📋 Field Names:');
      console.log(Object.keys(reports[0]).join(', '));
      
      console.log('\n🔍 Looking for name fields:');
      for (const key of Object.keys(reports[0])) {
        if (key.toLowerCase().includes('name') || key.toLowerCase().includes('title')) {
          console.log(`   ✅ ${key}: ${reports[0][key]}`);
        }
      }
      
      console.log('\n🔍 Looking for domain fields:');
      for (const key of Object.keys(reports[0])) {
        if (key.toLowerCase().includes('domain') || key.toLowerCase().includes('category')) {
          console.log(`   ✅ ${key}: ${reports[0][key]}`);
        }
      }
      
      console.log('\n🔍 ID field:');
      console.log(`   id: ${reports[0].id}`);
      console.log(`   reportId: ${reports[0].reportId}`);
      console.log(`   report_id: ${reports[0].report_id}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkStructure();
