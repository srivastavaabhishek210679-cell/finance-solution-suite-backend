import { Request, Response } from 'express';
import pool from '../config/database';


export const liveDataController = {
  getKPIs: async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      const tenantId = (req as any).tenantId || 1;
      let q = 'SELECT * FROM live_kpi_metrics WHERE tenant_id=$1 AND metric_date=CURRENT_DATE';
      const params: any[] = [tenantId];
      if (category) { q += ' AND category=$2'; params.push(category); }
      q += ' ORDER BY category, metric_name';
      const result = await pool.query(q, params);
      const grouped = result.rows.reduce((acc: any, row: any) => {
        if (!acc[row.category]) acc[row.category] = {};
        acc[row.category][row.metric_name] = { value: row.metric_value, text: row.metric_text };
        return acc;
      }, {});
      res.json({ status: 'success', data: grouped, raw: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getCharts: async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      const tenantId = (req as any).tenantId || 1;
      let q = 'SELECT * FROM live_chart_data WHERE tenant_id=$1';
      const params: any[] = [tenantId];
      if (category) { q += ' AND category=$2'; params.push(category); }
      q += ' ORDER BY category, chart_name';
      const result = await pool.query(q, params);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getSources: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM data_sources_config ORDER BY category, name');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createSource: async (req: Request, res: Response) => {
    try {
      const { name, source_type, category, config, schedule_cron } = req.body;
      const result = await pool.query(
        'INSERT INTO data_sources_config (name, source_type, category, config, schedule_cron) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [name, source_type, category, JSON.stringify(config||{}), schedule_cron||'0 */2 * * *']
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  toggleSource: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('UPDATE data_sources_config SET is_active=NOT is_active WHERE source_id=$1 RETURNING *', [req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  triggerRefresh: async (req: Request, res: Response) => {
    try {
      const { runDataRefresh } = await import('../services/liveData.service'); runDataRefresh().catch(console.error);
      res.json({ status: 'success', message: 'Data refresh triggered' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getRefreshLog: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM data_refresh_log ORDER BY started_at DESC LIMIT 20');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getSnapshots: async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      const tenantId = (req as any).tenantId || 1;
      let q = 'SELECT source_id, category, snapshot_date, record_count, created_at FROM live_data_snapshots WHERE tenant_id=$1';
      const params: any[] = [tenantId];
      if (category) { q += ' AND category=$2'; params.push(category); }
      q += ' ORDER BY created_at DESC LIMIT 50';
      const result = await pool.query(q, params);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};