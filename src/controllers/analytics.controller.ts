import { Request, Response } from 'express';
import pool from '../config/database';

const getInterval = (period: string): string => {
  if (period === 'day') return '1 day';
  if (period === 'week') return '7 days';
  if (period === 'quarter') return '90 days';
  if (period === 'biannual') return '180 days';
  if (period === 'annual') return '365 days';
  return '30 days';
};

const getGroupBy = (period: string): string => {
  if (period === 'day') return 'hour';
  if (period === 'week' || period === 'month') return 'day';
  return 'month';
};

export const analyticsController = {

  getCustomerAnalytics: async (req: Request, res: Response) => {
    try {
      const period = String(req.query.period || 'month');
      const interval = getInterval(period);

      const topQ = 'SELECT customer_name, customer_email, COUNT(*) as order_count, COALESCE(SUM(total_amount),0) as total_revenue, COALESCE(AVG(total_amount),0) as avg_order_value, MAX(order_date) as last_order FROM orders WHERE order_date >= NOW() - INTERVAL ' + "'" + interval + "'" + ' AND status != ' + "'Cancelled'" + ' GROUP BY customer_name, customer_email ORDER BY total_revenue DESC LIMIT 10';

      const bottomQ = 'SELECT customer_name, customer_email, COUNT(*) as order_count, COALESCE(SUM(total_amount),0) as total_revenue, MAX(order_date) as last_order FROM orders WHERE order_date >= NOW() - INTERVAL ' + "'" + interval + "'" + ' AND status != ' + "'Cancelled'" + ' GROUP BY customer_name, customer_email ORDER BY total_revenue ASC LIMIT 10';

      const freqQ = 'SELECT customer_name, customer_email, COUNT(*) as order_count, COALESCE(SUM(total_amount),0) as total_revenue, MAX(order_date) as last_order FROM orders WHERE order_date >= NOW() - INTERVAL ' + "'" + interval + "'" + ' AND status != ' + "'Cancelled'" + ' GROUP BY customer_name, customer_email HAVING COUNT(*) >= 2 ORDER BY order_count DESC LIMIT 10';

      const leastQ = 'SELECT customer_name, customer_email, COUNT(*) as total_orders, MAX(order_date) as last_order, COALESCE(SUM(total_amount),0) as total_revenue FROM orders WHERE status != ' + "'Cancelled'" + ' GROUP BY customer_name, customer_email HAVING MAX(order_date) < NOW() - INTERVAL ' + "'60 days'" + ' ORDER BY last_order ASC LIMIT 10';

      const avgQ = 'SELECT customer_name, customer_email, COUNT(*) as order_count, COALESCE(SUM(total_amount),0) as total_revenue FROM orders WHERE order_date >= NOW() - INTERVAL ' + "'" + interval + "'" + ' AND status != ' + "'Cancelled'" + ' GROUP BY customer_name, customer_email ORDER BY total_revenue ASC LIMIT 10';

      const [top, bottom, freq, least, avg] = await Promise.all([
        pool.query(topQ), pool.query(bottomQ), pool.query(freqQ), pool.query(leastQ), pool.query(avgQ)
      ]);

      res.json({ status: 'success', period, data: {
        topCustomers: top.rows,
        bottomCustomers: bottom.rows,
        frequentCustomers: freq.rows,
        leastActive: least.rows,
        avgCustomers: avg.rows
      }});
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getOrderAnalytics: async (req: Request, res: Response) => {
    try {
      const period = String(req.query.period || 'month');
      const interval = getInterval(period);
      const groupBy = getGroupBy(period);

      const trendQ = 'SELECT DATE_TRUNC(' + "'" + groupBy + "'" + ', order_date) as period, COUNT(*) as order_count, COALESCE(SUM(total_amount),0) as revenue, COALESCE(AVG(total_amount),0) as avg_order FROM orders WHERE order_date >= NOW() - INTERVAL ' + "'" + interval + "'" + ' GROUP BY period ORDER BY period';

      const topQ = 'SELECT order_id, order_number, customer_name, total_amount, status, payment_status, order_date FROM orders WHERE order_date >= NOW() - INTERVAL ' + "'" + interval + "'" + ' ORDER BY total_amount DESC LIMIT 10';

      const lowQ = 'SELECT order_id, order_number, customer_name, total_amount, status, payment_status, order_date FROM orders WHERE order_date >= NOW() - INTERVAL ' + "'" + interval + "'" + ' ORDER BY total_amount ASC LIMIT 10';

      const statsQ = 'SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount),0) as total_revenue, COALESCE(AVG(total_amount),0) as avg_order, MAX(total_amount) as max_order, MIN(total_amount) as min_order, COUNT(CASE WHEN status=' + "'Delivered'" + ' THEN 1 END) as delivered, COUNT(CASE WHEN status=' + "'Cancelled'" + ' THEN 1 END) as cancelled, COUNT(CASE WHEN status=' + "'Pending'" + ' THEN 1 END) as pending FROM orders WHERE order_date >= NOW() - INTERVAL ' + "'" + interval + "'";

      const [trend, top, low, stats] = await Promise.all([
        pool.query(trendQ), pool.query(topQ), pool.query(lowQ), pool.query(statsQ)
      ]);

      res.json({ status: 'success', period, data: {
        ordersTrend: trend.rows, topOrders: top.rows, lowOrders: low.rows, stats: stats.rows[0]
      }});
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getTiers: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM customer_tiers ORDER BY min_order_value ASC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getCustomerTier: async (req: Request, res: Response) => {
    try {
      const email = req.params.email;
      const customerData = await pool.query('SELECT customer_email, COUNT(*) as order_count, COALESCE(SUM(total_amount),0) as total_spend FROM orders WHERE customer_email=' + '' + ' AND status != ' + "'Cancelled'" + ' GROUP BY customer_email', [email]);
      if (!customerData.rows.length) return res.json({ status: 'success', data: null });
      const { order_count, total_spend } = customerData.rows[0];
      const tiers = await pool.query('SELECT * FROM customer_tiers ORDER BY min_order_value DESC');
      let tier = tiers.rows[tiers.rows.length - 1];
      for (const t of tiers.rows) {
        if (parseFloat(total_spend) >= t.min_order_value && parseInt(order_count) >= t.min_order_count) { tier = t; break; }
      }
      res.json({ status: 'success', data: { ...tier, total_spend, order_count } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getCampaigns: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM customer_campaigns WHERE is_active=true ORDER BY created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  createCampaign: async (req: Request, res: Response) => {
    try {
      const { campaign_name, campaign_type, target_segment, discount_percent, message, start_date, end_date } = req.body;
      const result = await pool.query('INSERT INTO customer_campaigns (campaign_name, campaign_type, target_segment, discount_percent, message, start_date, end_date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [campaign_name, campaign_type, target_segment, discount_percent, message, start_date, end_date]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};