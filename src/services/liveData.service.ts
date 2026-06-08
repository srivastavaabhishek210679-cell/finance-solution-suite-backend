import * as cron from 'node-cron';
import pool from '../config/database';

const saveKPI = async (category: string, name: string, value: number, text?: string) => {
  const s = String.fromCharCode(36);
  await pool.query(
    'INSERT INTO live_kpi_metrics (tenant_id, category, metric_name, metric_value, metric_text, metric_date, period) VALUES (1,' + s + '1,' + s + '2,' + s + '3,' + s + '4,CURRENT_DATE,' + String.fromCharCode(39) + 'daily' + String.fromCharCode(39) + ') ON CONFLICT (tenant_id, category, metric_name, metric_date, period) DO UPDATE SET metric_value=' + s + '3, metric_text=' + s + '4',
    [category, name, value, text || String(value)]
  );
};

const saveChart = async (category: string, name: string, type: string, series: any, labels: any) => {
  const s = String.fromCharCode(36);
  await pool.query(
    'INSERT INTO live_chart_data (tenant_id, category, chart_name, chart_type, series_data, labels, period) VALUES (1,' + s + '1,' + s + '2,' + s + '3,' + s + '4,' + s + '5,' + String.fromCharCode(39) + 'monthly' + String.fromCharCode(39) + ') ON CONFLICT (tenant_id, category, chart_name, period) DO UPDATE SET series_data=' + s + '4, labels=' + s + '5, generated_at=NOW()',
    [category, name, type, JSON.stringify(series), JSON.stringify(labels)]
  );
};

export const runDataRefresh = async () => {
  const startTime = Date.now();
  console.log('[LiveData] Starting data refresh...');
  try {
    const s = String.fromCharCode(39);

    // Finance & Orders
    const ordersRes = await pool.query('SELECT COUNT(*) as total, COALESCE(SUM(total_amount),0) as revenue, COUNT(CASE WHEN status=' + s + 'Delivered' + s + ' THEN 1 END) as delivered, COUNT(CASE WHEN status=' + s + 'Pending' + s + ' THEN 1 END) as pending FROM orders');
    const orders = ordersRes.rows[0];
    await saveKPI('finance', 'Total Revenue', parseFloat(orders.revenue), 'Rs.' + Number(orders.revenue).toLocaleString());
    await saveKPI('finance', 'Total Orders', parseFloat(orders.total));
    await saveKPI('finance', 'Delivered Orders', parseFloat(orders.delivered));
    await saveKPI('finance', 'Pending Orders', parseFloat(orders.pending));

    // Sales trend - last 6 months
    const salesRes = await pool.query('SELECT DATE_TRUNC(' + s + 'month' + s + ', order_date) as month, COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as rev FROM orders WHERE order_date >= NOW() - INTERVAL ' + s + '6 months' + s + ' GROUP BY month ORDER BY month');
    const salesLabels = salesRes.rows.map((r: any) => new Date(r.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }));
    const salesSeries = [
      { name: 'Revenue', data: salesRes.rows.map((r: any) => parseFloat(r.rev)) },
      { name: 'Orders', data: salesRes.rows.map((r: any) => parseInt(r.cnt)) }
    ];
    await saveChart('finance', 'Monthly Revenue Trend', 'line', salesSeries, salesLabels);
    await saveKPI('sales', 'Monthly Revenue', salesRes.rows.length > 0 ? parseFloat(salesRes.rows[salesRes.rows.length-1].rev) : 0);

    // Supply
    const posRes = await pool.query('SELECT COUNT(*) as total, COALESCE(SUM(total_amount),0) as spend FROM purchase_orders');
    const suppRes = await pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status=' + s + 'Active' + s + ' THEN 1 END) as active FROM suppliers');
    await saveKPI('supply', 'Total POs', parseFloat(posRes.rows[0].total));
    await saveKPI('supply', 'Total Spend', parseFloat(posRes.rows[0].spend), 'Rs.' + Number(posRes.rows[0].spend).toLocaleString());
    await saveKPI('supply', 'Active Suppliers', parseFloat(suppRes.rows[0].active));

    // HR
    const hrRes = await pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status='+s+'active'+s+' THEN 1 END) as active FROM users');
    await saveKPI('hr', 'Total Users', parseFloat(hrRes.rows[0].total));
    await saveKPI('hr', 'Active Users', parseFloat(hrRes.rows[0].active));

    // Order status pie chart
    const pieData = [
      { name: 'Delivered', value: parseFloat(orders.delivered) },
      { name: 'Pending', value: parseFloat(orders.pending) },
      { name: 'Other', value: Math.max(0, parseFloat(orders.total) - parseFloat(orders.delivered) - parseFloat(orders.pending)) }
    ];
    await saveChart('finance', 'Order Status Distribution', 'pie', pieData, pieData.map((p: any) => p.name));

    // HR charts - wrapped in try-catch for debugging
    try {
    const hrTrendRes = await pool.query('SELECT DATE_TRUNC(' + s + 'month' + s + ', created_at) as month, COUNT(*) as cnt FROM users WHERE created_at >= NOW() - INTERVAL ' + s + '6 months' + s + ' GROUP BY month ORDER BY month');
    const hrLabels = hrTrendRes.rows.length > 0 ? hrTrendRes.rows.map((r) => new Date(r.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })) : ['No Data'];
    const hrSeries = [{ name: 'New Users', data: hrTrendRes.rows.length > 0 ? hrTrendRes.rows.map((r) => parseInt(r.cnt)) : [0] }];
    await saveChart('hr', 'User Growth Trend', 'line', hrSeries, hrLabels);

    // Supply charts
    const poTrendRes = await pool.query('SELECT DATE_TRUNC(' + s + 'month' + s + ', order_date) as month, COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as spend FROM purchase_orders WHERE order_date >= NOW() - INTERVAL ' + s + '6 months' + s + ' GROUP BY month ORDER BY month');
    const poLabels = poTrendRes.rows.length > 0 ? poTrendRes.rows.map((r) => new Date(r.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })) : ['No Data'];
    const poSeries = [
      { name: 'PO Count', data: poTrendRes.rows.length > 0 ? poTrendRes.rows.map((r) => parseInt(r.cnt)) : [0] },
      { name: 'Spend', data: poTrendRes.rows.length > 0 ? poTrendRes.rows.map((r) => parseFloat(r.spend)) : [0] }
    ];
    await saveChart('supply', 'Purchase Order Trends', 'line', poSeries, poLabels);

    // Supplier category breakdown
    const suppCatRes = await pool.query('SELECT category, COUNT(*) as cnt FROM suppliers WHERE category IS NOT NULL GROUP BY category ORDER BY cnt DESC');
    const suppPieData = suppCatRes.rows.length > 0 ? suppCatRes.rows.map((r) => ({ name: r.category, value: parseInt(r.cnt) })) : [{ name: 'No Data', value: 1 }];
    await saveChart('supply', 'Supplier Categories', 'pie', suppPieData, suppPieData.map((r) => r.name));

    // Sales order status chart
    const salesStatusRes = await pool.query('SELECT status, COUNT(*) as cnt FROM orders GROUP BY status');
    const salesPieData = salesStatusRes.rows.length > 0 ? salesStatusRes.rows.map((r) => ({ name: r.status, value: parseInt(r.cnt) })) : [{ name: 'No Data', value: 1 }];
    await saveChart('sales', 'Sales Order Status', 'pie', salesPieData, salesPieData.map((r) => r.name));

    // Sales payment status
    const payStatusRes = await pool.query('SELECT payment_status, COUNT(*) as cnt FROM orders GROUP BY payment_status');
    const payPieData = payStatusRes.rows.length > 0 ? payStatusRes.rows.map((r) => ({ name: r.payment_status, value: parseInt(r.cnt) })) : [{ name: 'No Data', value: 1 }];
    await saveChart('sales', 'Payment Status', 'pie', payPieData, payPieData.map((r) => r.name));
    } catch (chartErr) { console.error('[LiveData] Chart generation error:', chartErr); }
    // ── PAYROLL ─────────────────────────────────────────────────────────────
    try {
      const prRes = await pool.query("SELECT COUNT(*) as total_runs, COALESCE(SUM(total_net),0) as payout, COALESCE(SUM(total_gross),0) as gross FROM payroll_runs");
      await saveKPI("payroll", "Total Payroll Runs", parseFloat(prRes.rows[0].total_runs));
      await saveKPI("payroll", "Total Payout", parseFloat(prRes.rows[0].payout), "Rs." + Number(prRes.rows[0].payout).toLocaleString());
      await saveKPI("payroll", "Gross Pay", parseFloat(prRes.rows[0].gross), "Rs." + Number(prRes.rows[0].gross).toLocaleString());
    } catch(e) { console.error("[LiveData] Payroll error:", e); }

    // ── ATTENDANCE ───────────────────────────────────────────────────────────
    try {
      const attRes = await pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='Present' THEN 1 END) as present, COUNT(CASE WHEN status='Absent' THEN 1 END) as absent, COUNT(CASE WHEN status='Late' THEN 1 END) as late FROM attendance_records WHERE date >= CURRENT_DATE - INTERVAL '30 days'");
      await saveKPI("attendance", "Present (30d)", parseFloat(attRes.rows[0].present));
      await saveKPI("attendance", "Absent (30d)", parseFloat(attRes.rows[0].absent));
      await saveKPI("attendance", "Late (30d)", parseFloat(attRes.rows[0].late));
      const attPie = [{ name:"Present", value:parseFloat(attRes.rows[0].present)||0 }, { name:"Absent", value:parseFloat(attRes.rows[0].absent)||0 }, { name:"Late", value:parseFloat(attRes.rows[0].late)||0 }];
      await saveChart("attendance", "Attendance Overview", "pie", attPie, attPie.map(r=>r.name));
    } catch(e) { console.error("[LiveData] Attendance error:", e); }

    // ── LEAVE ────────────────────────────────────────────────────────────────
    try {
      const lvRes = await pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='Approved' THEN 1 END) as approved, COUNT(CASE WHEN status='Pending' THEN 1 END) as pending, COUNT(CASE WHEN status='Rejected' THEN 1 END) as rejected FROM leave_requests");
      await saveKPI("leave", "Total Requests", parseFloat(lvRes.rows[0].total));
      await saveKPI("leave", "Approved", parseFloat(lvRes.rows[0].approved));
      await saveKPI("leave", "Pending", parseFloat(lvRes.rows[0].pending));
      const lvPie = [{ name:"Approved", value:parseFloat(lvRes.rows[0].approved)||0 }, { name:"Pending", value:parseFloat(lvRes.rows[0].pending)||0 }, { name:"Rejected", value:parseFloat(lvRes.rows[0].rejected)||0 }];
      await saveChart("leave", "Leave Status", "pie", lvPie, lvPie.map(r=>r.name));
    } catch(e) { console.error("[LiveData] Leave error:", e); }

    // ── INVENTORY ────────────────────────────────────────────────────────────
    try {
      const invRes = await pool.query("SELECT COUNT(*) as total, COALESCE(SUM(current_stock),0) as stock, COALESCE(SUM(current_stock*unit_price),0) as value, COUNT(CASE WHEN current_stock<=minimum_stock THEN 1 END) as low FROM inventory_items");
      await saveKPI("inventory", "Total Items", parseFloat(invRes.rows[0].total));
      await saveKPI("inventory", "Total Stock", parseFloat(invRes.rows[0].stock));
      await saveKPI("inventory", "Stock Value", parseFloat(invRes.rows[0].value), "Rs."+Number(invRes.rows[0].value).toLocaleString());
      await saveKPI("inventory", "Low Stock", parseFloat(invRes.rows[0].low));
      const invCat = await pool.query("SELECT COALESCE(category,'Other') as cat, COUNT(*) as cnt FROM inventory_items GROUP BY category ORDER BY cnt DESC LIMIT 6");
      const invPie = invCat.rows.map(r=>({ name:r.cat, value:parseInt(r.cnt) }));
      if(invPie.length>0) await saveChart("inventory", "Stock by Category", "pie", invPie, invPie.map(r=>r.name));
    } catch(e) { console.error("[LiveData] Inventory error:", e); }

    // ── EXPENSES ─────────────────────────────────────────────────────────────
    try {
      const expRes = await pool.query("SELECT COUNT(*) as total, COALESCE(SUM(amount),0) as amt, COUNT(CASE WHEN status='Approved' THEN 1 END) as approved, COUNT(CASE WHEN status='Pending' THEN 1 END) as pending FROM expenses");
      await saveKPI("expense", "Total Amount", parseFloat(expRes.rows[0].amt), "Rs."+Number(expRes.rows[0].amt).toLocaleString());
      await saveKPI("expense", "Approved", parseFloat(expRes.rows[0].approved));
      await saveKPI("expense", "Pending", parseFloat(expRes.rows[0].pending));
      const expCat = await pool.query("SELECT COALESCE(category,'Other') as cat, COALESCE(SUM(amount),0) as amt FROM expenses GROUP BY cat ORDER BY amt DESC LIMIT 6");
      if(expCat.rows.length>0) { const ep = expCat.rows.map(r=>({ name:r.cat, value:parseFloat(r.amt) })); await saveChart("expense", "Expenses by Category", "pie", ep, ep.map(r=>r.name)); }
    } catch(e) { console.error("[LiveData] Expense error:", e); }

    // ── INVOICES ─────────────────────────────────────────────────────────────
    try {
      const invRes2 = await pool.query("SELECT COUNT(*) as total, COALESCE(SUM(total_amount),0) as amt, COUNT(CASE WHEN status='Paid' THEN 1 END) as paid, COUNT(CASE WHEN status='Overdue' THEN 1 END) as overdue FROM invoices");
      await saveKPI("invoice", "Total Invoices", parseFloat(invRes2.rows[0].total));
      await saveKPI("invoice", "Invoice Value", parseFloat(invRes2.rows[0].amt), "Rs."+Number(invRes2.rows[0].amt).toLocaleString());
      await saveKPI("invoice", "Paid", parseFloat(invRes2.rows[0].paid));
      await saveKPI("invoice", "Overdue", parseFloat(invRes2.rows[0].overdue));
      const invPie2 = [{ name:"Paid", value:parseFloat(invRes2.rows[0].paid)||0 }, { name:"Overdue", value:parseFloat(invRes2.rows[0].overdue)||0 }, { name:"Other", value:Math.max(0,parseFloat(invRes2.rows[0].total)-parseFloat(invRes2.rows[0].paid)-parseFloat(invRes2.rows[0].overdue)) }];
      await saveChart("invoice", "Invoice Status", "pie", invPie2, invPie2.map(r=>r.name));
    } catch(e) { console.error("[LiveData] Invoice error:", e); }

    // ── BUDGET ───────────────────────────────────────────────────────────────
    try {
      const budRes = await pool.query("SELECT COUNT(*) as total, COALESCE(SUM(allocated_amount),0) as budget, COALESCE(SUM(spent_amount),0) as spent FROM budgets");
      await saveKPI("budget", "Total Budgets", parseFloat(budRes.rows[0].total));
      await saveKPI("budget", "Total Budget", parseFloat(budRes.rows[0].budget), "Rs."+Number(budRes.rows[0].budget).toLocaleString());
      await saveKPI("budget", "Total Spent", parseFloat(budRes.rows[0].spent), "Rs."+Number(budRes.rows[0].spent).toLocaleString());
    } catch(e) { console.error("[LiveData] Budget error:", e); }

    // ── PROJECTS ─────────────────────────────────────────────────────────────
    try {
      const projRes = await pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='Active' THEN 1 END) as active, COUNT(CASE WHEN status='Completed' THEN 1 END) as completed FROM pm_projects");
      await saveKPI("project", "Total Projects", parseFloat(projRes.rows[0].total));
      await saveKPI("project", "Active", parseFloat(projRes.rows[0].active));
      await saveKPI("project", "Completed", parseFloat(projRes.rows[0].completed));
      const projPie = [{ name:"Active", value:parseFloat(projRes.rows[0].active)||0 }, { name:"Completed", value:parseFloat(projRes.rows[0].completed)||0 }];
      await saveChart("project", "Project Status", "pie", projPie, projPie.map(r=>r.name));
    } catch(e) { console.error("[LiveData] Project error:", e); }

    // ── HELPDESK ─────────────────────────────────────────────────────────────
    try {
      const hdRes = await pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='Open' THEN 1 END) as open, COUNT(CASE WHEN status='Resolved' THEN 1 END) as resolved, COUNT(CASE WHEN priority='High' THEN 1 END) as high FROM helpdesk_tickets");
      await saveKPI("helpdesk", "Total Tickets", parseFloat(hdRes.rows[0].total));
      await saveKPI("helpdesk", "Open", parseFloat(hdRes.rows[0].open));
      await saveKPI("helpdesk", "Resolved", parseFloat(hdRes.rows[0].resolved));
      await saveKPI("helpdesk", "High Priority", parseFloat(hdRes.rows[0].high));
      const hdPie = [{ name:"Open", value:parseFloat(hdRes.rows[0].open)||0 }, { name:"Resolved", value:parseFloat(hdRes.rows[0].resolved)||0 }];
      await saveChart("helpdesk", "Ticket Status", "pie", hdPie, hdPie.map(r=>r.name));
    } catch(e) { console.error("[LiveData] Helpdesk error:", e); }

    // ── CRM ──────────────────────────────────────────────────────────────────
    try {
      const crmRes = await pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='Active' THEN 1 END) as active, COUNT(CASE WHEN status='Prospect' THEN 1 END) as prospects FROM crm_customers");
      await saveKPI("crm", "Total Customers", parseFloat(crmRes.rows[0].total));
      await saveKPI("crm", "Active", parseFloat(crmRes.rows[0].active));
      await saveKPI("crm", "Prospects", parseFloat(crmRes.rows[0].prospects));
      const crmPie = [{ name:"Active", value:parseFloat(crmRes.rows[0].active)||0 }, { name:"Prospects", value:parseFloat(crmRes.rows[0].prospects)||0 }];
      await saveChart("crm", "Customer Status", "pie", crmPie, crmPie.map(r=>r.name));
    } catch(e) { console.error("[LiveData] CRM error:", e); }

    // ── RISKS ────────────────────────────────────────────────────────────────
    try {
      const riskRes = await pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN impact='High' THEN 1 END) as high, COUNT(CASE WHEN impact='Medium' THEN 1 END) as medium, COUNT(CASE WHEN impact='Low' THEN 1 END) as low FROM risks");
      await saveKPI("risk", "Total Risks", parseFloat(riskRes.rows[0].total));
      await saveKPI("risk", "High", parseFloat(riskRes.rows[0].high));
      await saveKPI("risk", "Medium", parseFloat(riskRes.rows[0].medium));
      const riskPie = [{ name:"High", value:parseFloat(riskRes.rows[0].high)||0 }, { name:"Medium", value:parseFloat(riskRes.rows[0].medium)||0 }, { name:"Low", value:parseFloat(riskRes.rows[0].low)||0 }];
      await saveChart("risk", "Risk Severity", "pie", riskPie, riskPie.map(r=>r.name));
    } catch(e) { console.error("[LiveData] Risk error:", e); }

    // ── COMPLIANCE ───────────────────────────────────────────────────────────
    try {
      const compRes = await pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='Compliant' THEN 1 END) as compliant, COUNT(CASE WHEN status='Non-Compliant' THEN 1 END) as non_compliant FROM compliance_items");
      await saveKPI("compliance", "Total Items", parseFloat(compRes.rows[0].total));
      await saveKPI("compliance", "Compliant", parseFloat(compRes.rows[0].compliant));
      await saveKPI("compliance", "Non-Compliant", parseFloat(compRes.rows[0].non_compliant));
      const compPie = [{ name:"Compliant", value:parseFloat(compRes.rows[0].compliant)||0 }, { name:"Non-Compliant", value:parseFloat(compRes.rows[0].non_compliant)||0 }];
      await saveChart("compliance", "Compliance Status", "pie", compPie, compPie.map(r=>r.name));
    } catch(e) { console.error("[LiveData] Compliance error:", e); }

    // ── ASSETS ───────────────────────────────────────────────────────────────
    try {
      const astRes = await pool.query("SELECT COUNT(*) as total, COALESCE(SUM(current_value),0) as val, COUNT(CASE WHEN status='Active' THEN 1 END) as active FROM assets");
      await saveKPI("asset", "Total Assets", parseFloat(astRes.rows[0].total));
      await saveKPI("asset", "Asset Value", parseFloat(astRes.rows[0].val), "Rs."+Number(astRes.rows[0].val).toLocaleString());
      await saveKPI("asset", "Active Assets", parseFloat(astRes.rows[0].active));
    } catch(e) { console.error("[LiveData] Asset error:", e); }

    // ── PERFORMANCE ──────────────────────────────────────────────────────────
    try {
      const perfRes = await pool.query("SELECT COUNT(*) as total, COALESCE(AVG(overall_rating),0) as avg FROM performance_reviews");
      await saveKPI("performance", "Total Reviews", parseFloat(perfRes.rows[0].total));
      await saveKPI("performance", "Avg Rating", parseFloat(perfRes.rows[0].avg), parseFloat(perfRes.rows[0].avg).toFixed(1)+"/5");
    } catch(e) { console.error("[LiveData] Performance error:", e); }

    // ── TRAINING ─────────────────────────────────────────────────────────────
    try {
      const trainRes = await pool.query("SELECT COUNT(*) as total, COUNT(DISTINCT department) as departments FROM training_enrollments");
      await saveKPI("training", "Total Enrollments", parseFloat(trainRes.rows[0].total));
      await saveKPI("training", "Departments Enrolled", parseFloat(trainRes.rows[0].departments));
    } catch(e) { console.error("[LiveData] Training error:", e); }

    // ── TRAVEL ───────────────────────────────────────────────────────────────
    try {
      const trvRes = await pool.query("SELECT COUNT(*) as total, COALESCE(SUM(estimated_cost),0) as cost, COUNT(CASE WHEN status='Approved' THEN 1 END) as approved FROM travel_requests");
      await saveKPI("travel", "Total Requests", parseFloat(trvRes.rows[0].total));
      await saveKPI("travel", "Travel Cost", parseFloat(trvRes.rows[0].cost), "Rs."+Number(trvRes.rows[0].cost).toLocaleString());
      await saveKPI("travel", "Approved", parseFloat(trvRes.rows[0].approved));
    } catch(e) { console.error("[LiveData] Travel error:", e); }

    // ── CONTRACTS ────────────────────────────────────────────────────────────
    try {
      const conRes = await pool.query("SELECT COUNT(*) as total, COALESCE(SUM(value),0) as val, COUNT(CASE WHEN status='Active' THEN 1 END) as active FROM contracts");
      await saveKPI("contract", "Total Contracts", parseFloat(conRes.rows[0].total));
      await saveKPI("contract", "Contract Value", parseFloat(conRes.rows[0].val), "Rs."+Number(conRes.rows[0].val).toLocaleString());
      await saveKPI("contract", "Active", parseFloat(conRes.rows[0].active));
    } catch(e) { console.error("[LiveData] Contract error:", e); }

    // ── VENDORS ──────────────────────────────────────────────────────────────
    try {
      const venRes = await pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='Active' THEN 1 END) as active FROM vendors");
      await saveKPI("vendor", "Total Vendors", parseFloat(venRes.rows[0].total));
      await saveKPI("vendor", "Active Vendors", parseFloat(venRes.rows[0].active));
    } catch(e) { console.error("[LiveData] Vendor error:", e); }
    // Log
    await pool.query('INSERT INTO data_refresh_log (source_name, completed_at, status, records_processed) VALUES (' + s + 'Full Refresh' + s + ',NOW(),' + s + 'success' + s + ',20)').catch(() => {});
    console.log('[LiveData] Refresh done in ' + (Date.now() - startTime) + 'ms');
  } catch (e) {
    console.error('[LiveData] Failed:', e);
  }
};

export const startLiveDataService = () => {
  cron.schedule('0 */2 * * *', runDataRefresh);
  cron.schedule('0 0 * * *', runDataRefresh);
  console.log('[LiveData] Service started - refreshing every 2 hours');
  runDataRefresh();
};