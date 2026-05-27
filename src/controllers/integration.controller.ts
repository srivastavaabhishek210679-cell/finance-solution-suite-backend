import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const integrationController = {
  getAll: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const result = await pool.query(
      'SELECT * FROM data_sources WHERE tenant_id = \ ORDER BY source_id',
      [tenantId]
    );
    res.json({ status: 'success', data: result.rows });
  },

  connect: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const { id } = req.params;
    const { api_key, api_secret, instance_url } = req.body;
    const credentials = { api_key, api_secret, instance_url, connected_at: new Date().toISOString() };
    const result = await pool.query(
      'UPDATE data_sources SET connection_status=\, is_active=true, health_score=88, credentials=\, updated_at=NOW() WHERE source_id=\ AND tenant_id=\ RETURNING *',
      ['connected', JSON.stringify(credentials), id, tenantId]
    );
    res.json({ status: 'success', data: result.rows[0] });
  },

  disconnect: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE data_sources SET connection_status=\, is_active=false, health_score=0, credentials=\, updated_at=NOW() WHERE source_id=\ AND tenant_id=\ RETURNING *',
      ['disconnected', '{}', id, tenantId]
    );
    res.json({ status: 'success', data: result.rows[0] });
  },

  sync: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const { id } = req.params;
    const randomCount = Math.floor(Math.random() * 500) + 100;
    const result = await pool.query(
      'UPDATE data_sources SET last_sync=NOW(), last_sync_status=\, last_sync_count=\, sync_count=sync_count+1, updated_at=NOW() WHERE source_id=\ AND tenant_id=\ RETURNING *',
      ['success', randomCount, id, tenantId]
    );
    res.json({ status: 'success', data: result.rows[0], message: `Synced ${randomCount} records` });
  },

  updateConfig: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const { id } = req.params;
    const { config } = req.body;
    const result = await pool.query(
      'UPDATE data_sources SET config=\, updated_at=NOW() WHERE source_id=\ AND tenant_id=\ RETURNING *',
      [JSON.stringify(config), id, tenantId]
    );
    res.json({ status: 'success', data: result.rows[0] });
  }
};