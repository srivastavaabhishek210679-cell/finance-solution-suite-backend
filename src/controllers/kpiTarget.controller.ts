import { Request, Response } from 'express';
import pool from '../config/database';
const q = (n: number) => '$' + n;

export const kpiTargetController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId || 1;
      const result = await pool.query('SELECT * FROM kpi_targets WHERE tenant_id=' + q(1) + ' ORDER BY category, metric_name', [tenantId]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const tenantId = (req as any).tenantId || 1;
      const { category, metric_name, target_value, unit, period, description, target_date } = req.body;
      const result = await pool.query(
        'INSERT INTO kpi_targets (tenant_id, category, metric_name, target_value, unit, period, description, target_date, created_by) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',' + q(4) + ',' + q(5) + ',' + q(6) + ',' + q(7) + ',' + q(8) + ',' + q(9) + ') RETURNING *',
        [tenantId, category, metric_name, target_value, unit, period||'monthly', description, target_date, userId]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const { target_value, current_value, description, status } = req.body;
      const result = await pool.query(
        'UPDATE kpi_targets SET target_value=COALESCE(' + q(1) + ', target_value), current_value=COALESCE(' + q(2) + ', current_value), description=COALESCE(' + q(3) + ', description), status=COALESCE(' + q(4) + ', status), updated_at=NOW() WHERE target_id=' + q(5) + ' RETURNING *',
        [target_value, current_value, description, status, req.params.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM kpi_targets WHERE target_id=' + q(1), [req.params.id]);
      res.json({ status: 'success', message: 'Target deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  syncFromLiveData: async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId || 1;
      const liveKPIs = await pool.query('SELECT category, metric_name, metric_value FROM live_kpi_metrics WHERE tenant_id=' + q(1) + ' AND metric_date=CURRENT_DATE', [tenantId]);
      for (const kpi of liveKPIs.rows) {
        await pool.query(
          'UPDATE kpi_targets SET current_value=' + q(1) + ', updated_at=NOW() WHERE tenant_id=' + q(2) + ' AND category=' + q(3) + ' AND metric_name=' + q(4),
          [kpi.metric_value, tenantId, kpi.category, kpi.metric_name]
        );
      }
      res.json({ status: 'success', message: 'KPI targets synced from live data' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};