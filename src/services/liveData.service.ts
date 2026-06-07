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
    const hrRes = await pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN is_active=true THEN 1 END) as active FROM users');
    await saveKPI('hr', 'Total Users', parseFloat(hrRes.rows[0].total));
    await saveKPI('hr', 'Active Users', parseFloat(hrRes.rows[0].active));

    // Order status pie chart
    const pieData = [
      { name: 'Delivered', value: parseFloat(orders.delivered) },
      { name: 'Pending', value: parseFloat(orders.pending) },
      { name: 'Other', value: Math.max(0, parseFloat(orders.total) - parseFloat(orders.delivered) - parseFloat(orders.pending)) }
    ];
    await saveChart('finance', 'Order Status Distribution', 'pie', pieData, pieData.map((p: any) => p.name));

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