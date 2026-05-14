/**
 * Find and Delete Duplicate Reports
 * Scans all 500 reports across 13 domains and removes duplicates
 * Uses native Node.js fetch (no dependencies required)
 */

const API_BASE = 'http://localhost:3002/api/v1';

async function findDuplicates() {
  console.log('🔍 Scanning all reports for duplicates...\n');
  
  try {
    // Fetch all reports from master endpoint
    const response = await fetch(`${API_BASE}/reports/master?page=1&limit=500`);
    const data = await response.json();
    const reports = data.data;
    
    console.log(`✅ Found ${reports.length} total reports\n`);
    
    // Group reports by potential duplicate criteria
    const groups = {};
    
    reports.forEach(report => {
      // Key: reportName + domain + description (case-insensitive)
      const key = `${report.reportName}|${report.domain}|${report.description || ''}`.toLowerCase();
      
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
        console.log(`\n📄 ${items[0].reportName} (${items[0].domain})`);
        console.log(`   Description: ${items[0].description || 'N/A'}`);
        console.log(`   Found ${items.length} copies:\n`);
        
        // Sort by ID to keep the first one (lowest ID)
        items.sort((a, b) => a.id - b.id);
        
        items.forEach((item, index) => {
          const keepOrDelete = index === 0 ? '✅ KEEP' : '❌ DELETE';
          console.log(`   ${keepOrDelete} - ID #${item.id.toString().padStart(3, '0')} | ${(item.frequency || 'N/A').padEnd(10)} | ${item.complianceStatus || 'N/A'}`);
          
          if (index > 0) {
            duplicates.push(item.id);
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
        method: 'DELETE'
      });
      
      if (response.ok) {
        deleted++;
        console.log(`   ✅ Deleted report #${id}`);
      } else {
        failed++;
        console.log(`   ❌ Failed to delete report #${id}: ${response.status} ${response.statusText}`);
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
