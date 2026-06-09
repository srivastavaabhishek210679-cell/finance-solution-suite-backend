import { Request, Response } from 'express';
import pool from '../config/database';

export const analyticsController = {

  // Customer analytics by period
  getCustomerAnalytics: async (req: Request, res: Response) => {
    try {
      const period = req.query.period as string || 'month';
      let interval = '30 days';
      if (period === 'day') interval = '1 day';
      else if (period === 'week') interval = '7 days';
      else if (period === 'month') interval = '30 days';
      else if (period === 'quarter') interval = '90 days';
      else if (period === 'annual') interval = '365 days';

      // Top customers
      const topCustomers = await pool.query(
        SELECT customer_name, customer_email,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount),0) as total_revenue,
          COALESCE(AVG(total_amount),0) as avg_order_value,
          MAX(order_date) as last_order
        FROM orders
        WHERE order_date >= NOW() - INTERVAL ''
        AND status != 'Cancelled'
        GROUP BY customer_name, customer_email
        ORDER BY total_revenue DESC
        LIMIT 10
      );

      // Bottom customers
      const bottomCustomers = await pool.query(
        SELECT customer_name, customer_email,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount),0) as total_revenue,
          COALESCE(AVG(total_amount),0) as avg_order_value,
          MAX(order_date) as last_order
        FROM orders
        WHERE order_date >= NOW() - INTERVAL ''
        AND status != 'Cancelled'
        GROUP BY customer_name, customer_email
        ORDER BY total_revenue ASC
        LIMIT 10
      );

      // Average customers
      const avgRevenue = await pool.query(
        SELECT AVG(total) as avg FROM (
          SELECT SUM(total_amount) as total FROM orders
          WHERE order_date >= NOW() - INTERVAL '' AND status != 'Cancelled'
          GROUP BY customer_email
        ) t
      );
      const avg = parseFloat(avgRevenue.rows[0].avg) || 0;

      const avgCustomers = await pool.query(
        SELECT customer_name, customer_email,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount),0) as total_revenue
        FROM orders
        WHERE order_date >= NOW() - INTERVAL ''
        AND status != 'Cancelled'
        GROUP BY customer_name, customer_email
        HAVING SUM(total_amount) BETWEEN \ * 0.7 AND \ * 1.3
        ORDER BY total_revenue DESC
        LIMIT 10
      , [avg, avg]);

      // Least active (ordered before but not recently)
      const leastActive = await pool.query(
        SELECT customer_name, customer_email,
          COUNT(*) as total_orders,
          MAX(order_date) as last_order,
          COALESCE(SUM(total_amount),0) as total_revenue
        FROM orders
        WHERE status != 'Cancelled'
        GROUP BY customer_name, customer_email
        HAVING MAX(order_date) < NOW() - INTERVAL '60 days'
        ORDER BY last_order ASC
        LIMIT 10
      );

      // Frequent visitors (ordered 2+ times in period)
      const frequentCustomers = await pool.query(
        SELECT customer_name, customer_email,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount),0) as total_revenue,
          MAX(order_date) as last_order
        FROM orders
        WHERE order_date >= NOW() - INTERVAL ''
        AND status != 'Cancelled'
        GROUP BY customer_name, customer_email
        HAVING COUNT(*) >= 2
        ORDER BY order_count DESC
        LIMIT 10
      );

      res.json({
        status: 'success',
        period,
        data: {
          topCustomers: topCustomers.rows,
          bottomCustomers: bottomCustomers.rows,
          avgCustomers: avgCustomers.rows,
          leastActive: leastActive.rows,
          frequentCustomers: frequentCustomers.rows,
          avgOrderValue: avg
        }
      });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Order analytics by period
  getOrderAnalytics: async (req: Request, res: Response) => {
    try {
      const period = req.query.period as string || 'month';
      let interval = '30 days';
      let groupBy = 'day';
      if (period === 'day') { interval = '1 day'; groupBy = 'hour'; }
      else if (period === 'week') { interval = '7 days'; groupBy = 'day'; }
      else if (period === 'month') { interval = '30 days'; groupBy = 'day'; }
      else if (period === 'quarter') { interval = '90 days'; groupBy = 'week'; }
      else if (period === 'biannual') { interval = '180 days'; groupBy = 'month'; }
      else if (period === 'annual') { interval = '365 days'; groupBy = 'month'; }

      // Orders trend
      const ordersTrend = await pool.query(
        SELECT DATE_TRUNC('', order_date) as period,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount),0) as revenue,
          COALESCE(AVG(total_amount),0) as avg_order
        FROM orders
        WHERE order_date >= NOW() - INTERVAL ''
        GROUP BY period ORDER BY period
      );

      // Top orders
      const topOrders = await pool.query(
        SELECT order_id, order_number, customer_name, total_amount, status, payment_status, order_date
        FROM orders
        WHERE order_date >= NOW() - INTERVAL ''
        ORDER BY total_amount DESC LIMIT 10
      );

      // Low orders
      const lowOrders = await pool.query(
        SELECT order_id, order_number, customer_name, total_amount, status, payment_status, order_date
        FROM orders
        WHERE order_date >= NOW() - INTERVAL ''
        ORDER BY total_amount ASC LIMIT 10
      );

      // Stats summary
      const stats = await pool.query(
        SELECT
          COUNT(*) as total_orders,
          COALESCE(SUM(total_amount),0) as total_revenue,
          COALESCE(AVG(total_amount),0) as avg_order,
          MAX(total_amount) as max_order,
          MIN(total_amount) as min_order,
          COUNT(CASE WHEN status='Delivered' THEN 1 END) as delivered,
          COUNT(CASE WHEN status='Cancelled' THEN 1 END) as cancelled,
          COUNT(CASE WHEN status='Pending' THEN 1 END) as pending
        FROM orders
        WHERE order_date >= NOW() - INTERVAL ''
      );

      res.json({
        status: 'success',
        period,
        data: {
          ordersTrend: ordersTrend.rows,
          topOrders: topOrders.rows,
          lowOrders: lowOrders.rows,
          stats: stats.rows[0]
        }
      });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Get customer tier based on spend
  getCustomerTier: async (req: Request, res: Response) => {
    try {
      const { email } = req.params;
      const customerData = await pool.query(
        SELECT customer_email,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount),0) as total_spend
        FROM orders WHERE customer_email=\ AND status != 'Cancelled'
        GROUP BY customer_email
      , [email]);

      if (!customerData.rows.length) return res.json({ status: 'success', data: null });

      const { order_count, total_spend } = customerData.rows[0];
      const tiers = await pool.query('SELECT * FROM customer_tiers ORDER BY min_order_value DESC');

      let tier = tiers.rows[tiers.rows.length - 1]; // default bronze
      for (const t of tiers.rows) {
        if (parseFloat(total_spend) >= t.min_order_value && parseInt(order_count) >= t.min_order_count) {
          tier = t;
          break;
        }
      }

      res.json({ status: 'success', data: { ...tier, total_spend, order_count } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Get all tiers
  getTiers: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM customer_tiers ORDER BY min_order_value ASC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Get campaigns
  getCampaigns: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM customer_campaigns WHERE is_active=true ORDER BY created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Create campaign
  createCampaign: async (req: Request, res: Response) => {
    try {
      const { campaign_name, campaign_type, target_segment, discount_percent, message, start_date, end_date } = req.body;
      const result = await pool.query(
        'INSERT INTO customer_campaigns (campaign_name, campaign_type, target_segment, discount_percent, message, start_date, end_date) VALUES (\,\,\,\,\,\,\) RETURNING *',
        [campaign_name, campaign_type, target_segment, discount_percent, message, start_date, end_date]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Track visit
  trackVisit: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { customer_email } = req.body;
      await pool.query(
        INSERT INTO customer_visits (user_id, customer_email, visit_date, visit_count, last_visited)
        VALUES (\, \, CURRENT_DATE, 1, NOW())
        ON CONFLICT (user_id, visit_date)
        DO UPDATE SET visit_count = customer_visits.visit_count + 1, last_visited = NOW()
      , [userId, customer_email]);
      res.json({ status: 'success' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};