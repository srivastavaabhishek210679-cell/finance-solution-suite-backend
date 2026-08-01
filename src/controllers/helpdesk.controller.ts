import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';
import { onTicketCreated, generateTicketNumber } from '../services/events.service';

export const helpdeskController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM helpdesk_tickets WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as open, COUNT(CASE WHEN status=$2 THEN 1 END) as in_progress, COUNT(CASE WHEN status=$3 THEN 1 END) as resolved, COUNT(CASE WHEN priority=$4 THEN 1 END) as critical FROM helpdesk_tickets WHERE tenant_id=$5',
        ['Open', 'In Progress', 'Resolved', 'Critical', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { title, description, category, priority, raised_by, department } = req.body;
      const ticketNumber = await generateTicketNumber(db.id);
      const result = await pool.query(
        'INSERT INTO helpdesk_tickets (tenant_id,ticket_number,title,description,category,priority,requester_name,department) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
        [db.id, ticketNumber, title, description, category, priority||'Medium', raised_by, department]
      );
      onTicketCreated({...result.rows[0], requester_name: raised_by}, db.id).catch(console.error);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  update: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { status, assigned_to, resolution, priority } = req.body;
      const resolvedAt = status === 'Resolved' ? 'NOW()' : 'resolved_at';
      const result = await pool.query(
        'UPDATE helpdesk_tickets SET status=$1,assigned_to=$2,resolution=$3,priority=$4,resolved_at=' + resolvedAt + ',updated_at=NOW() WHERE ticket_id=$5 AND tenant_id=$6 RETURNING *',
        [status, assigned_to, resolution, priority, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateStatus: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { status, assigned_to, resolution } = req.body;
      const result = await pool.query(
        'UPDATE helpdesk_tickets SET status=$1,assigned_to=$2,resolution=$3,updated_at=NOW() WHERE ticket_id=$4 AND tenant_id=$5 RETURNING *',
        [status, assigned_to, resolution, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM helpdesk_tickets WHERE ticket_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
