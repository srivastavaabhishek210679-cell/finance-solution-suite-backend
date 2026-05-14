/**
 * Find and Delete Duplicate Reports - FIXED VERSION
 * Uses correct field names from API
 */

const API_BASE = 'http://localhost:3002/api/v1';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE0LCJ0ZW5hbnRJZCI6MSwicm9sZUlkIjoxLCJlbWFpbCI6ImFsaWNlLnNtaXRoQGRlbW8uY29tIiwiaWF0IjoxNzc3OTU2OTExLCJleHAiOjE3NzgwNDMzMTF9.pg3SfEc7iV9oOywGDjnfnN-IRC84xiYju68rtSWI1ho';

const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
};

async function findDuplicates() {
  console.log('🔍 Scanning all reports for duplicates...\n');
  
  try {
    // Fetch all reports from master endpoint
    const response = await fetch(`${API_BASE}/reports/master?page=1&limit=500`, {
      headers
    });
    
    if (response.status === 401) {
      console.error('❌ Authentication failed! Your token may be expired.');
      console.log('   Get a fresh token from browser and try again.\n');
      return [];
    }
    
    const data = await response.json();
    const reports = data.data || data.reports || data;
    
    if (!Array.isArray(reports)) {
      console.error('❌ Unexpected response structure:', Object.keys(data));
      return [];
    }
    
    console.log(`✅ Found ${reports.length} total reports\n`);
    
    // Group reports by potential duplicate criteria
    const groups = {};
    
    reports.forEach(report => {
      // Key: name + domain_id + description (case-insensitive)
      const key = `${report.name}|${report.domain_id}|${report.description || ''}`.toLowerCase();
      
      if (!groups[key]) {
        groups[key] = [];
      }
      
      groups[key].push(report);
    });
    
    // Find duplicates
    const duplicates = [];
    let totalDuplicates = 0;
    
    console.log('📊 DUPLICATE REPORTS FOUND:');
    console.log('='.repeat(80));
    
    for (const [key, items] of Object.entries(groups)) {
      if (items.length > 1) {
        console.log(`\n📄 ${items[0].name} (Domain ID: ${items[0].domain_id})`);
        console.log(`   Category: ${items[0].report_category || 'N/A'}`);
        console.log(`   Description: ${items[0].description || 'N/A'}`);
        console.log(`   Found ${items.length} copies:\n`);
        
        // Sort by report_id to keep the first one (lowest ID)
        items.sort((a, b) => a.report_id - b.report_id);
        
        items.forEach((item, index) => {
          const keepOrDelete = index === 0 ? '✅ KEEP' : '❌ DELETE';
          console.log(`   ${keepOrDelete} - ID #${item.report_id.toString().padStart(3, '0')} | ${(item.frequency || 'N/A').padEnd(10)} | ${item.compliance_status || 'N/A'}`);
          
          if (index > 0) {
            duplicates.push(item.report_id);
            totalDuplicates++;
          }
        });
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n🎯 SUMMARY:`);
    console.log(`   Total Reports: ${reports.length}`);
    console.log(`   Duplicate Groups: ${Object.values(groups).filter(g => g.length > 1).length}`);
    console.log(`   Duplicates to Remove: ${totalDuplicates}`);
    console.log(`   Reports After Cleanup: ${reports.length - totalDuplicates}\n`);
    
    return duplicates;
    
  } catch (error) {
    console.error('❌ Error fetching reports:', error.message);
    console.error('\n⚠️  Make sure your backend is running on http://localhost:3002\n');
    return [];
  }
}

async function deleteDuplicates(duplicateIds) {
  if (duplicateIds.length === 0) {
    console.log('✅ No duplicates to delete!\n');
    return;
  }
  
  console.log(`\n🗑️  Deleting ${duplicateIds.length} duplicate reports...\n`);
  
  let deleted = 0;
  let failed = 0;
  
  for (const id of duplicateIds) {
    try {
      const response = await fetch(`${API_BASE}/reports/master/${id}`, {
        method: 'DELETE',
        headers
      });
      
      if (response.ok) {
        deleted++;
        console.log(`   ✅ Deleted report #${id}`);
      } else {
        failed++;
        const errorData = await response.json().catch(() => ({}));
        console.log(`   ❌ Failed to delete report #${id}: ${response.status} - ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      failed++;
      console.log(`   ❌ Failed to delete report #${id}: ${error.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`\n🎉 CLEANUP COMPLETE!`);
  console.log(`   ✅ Successfully deleted: ${deleted}`);
  console.log(`   ❌ Failed to delete: ${failed}`);
  console.log(`\n✨ Your database is now clean!\n`);
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('  🧹 DUPLICATE REPORT CLEANUP TOOL');
  console.log('='.repeat(80) + '\n');
  
  // Step 1: Find duplicates
  const duplicateIds = await findDuplicates();
  
  if (duplicateIds.length === 0) {
    console.log('✅ No duplicates found! Your database is clean.\n');
    return;
  }
  
  // Step 2: Delete duplicates
  await deleteDuplicates(duplicateIds);
}

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error.message);
  process.exit(1);
});
