import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

// ── Public GET routes ─────────────────────────────────────────────────────────

// GET /api/v1/audit-logs?limit=50&page=1&action=login&table=reports_master
router.get('/', async (req: Request, res: Response) => {
  const limit  = Math.min(parseInt(req.query.limit  as string) || 50, 200);
  const page   = Math.max(parseInt(req.query.page   as string) || 1, 1);
  const offset = (page - 1) * limit;
  const action = req.query.action as string | undefined;
  const table  = req.query.table  as string | undefined;

  try {
    const params: any[] = [];
    const conditions: string[] = [];

    if (action) { params.push(`%${action}%`); conditions.push(`al.action ILIKE $${params.length}`); }
    if (table)  { params.push(table);          conditions.push(`al.table_name = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataResult, countResult] = await Promise.all([
      query(`
        SELECT
          al.log_id,
          al.action,
          al.table_name,
          al.resource_id,
          al.event_details,
          al.ip_address,
          al.created_at,
          u.email AS user_email
        FROM  audit_logs al
        LEFT  JOIN users u ON u.user_id = al.user_id
        ${where}
        ORDER BY al.created_at DESC
        LIMIT  $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]),

      query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      status: 'success',
      data:   dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error('[AuditLogs] getAll error:', err.message);
    res.json({ status: 'success', data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
  }
});

// GET /api/v1/audit-logs/summary — counts by action type
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        action,
        COUNT(*) AS count,
        MAX(created_at) AS last_occurrence
      FROM  audit_logs
      GROUP BY action
      ORDER BY count DESC
      LIMIT 20
    `);

    const totalResult = await query('SELECT COUNT(*) FROM audit_logs');
    const total = parseInt(totalResult.rows[0].count);

    res.json({ status: 'success', total, byAction: result.rows });
  } catch (err: any) {
    res.json({ status: 'success', total: 0, byAction: [] });
  }
});

// GET /api/v1/audit-logs/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT al.*, u.email AS user_email
       FROM  audit_logs al
       LEFT  JOIN users u ON u.user_id = al.user_id
       WHERE al.log_id = $1`,
      [req.params.id],
    );
    if (!result.rows.length) {
      res.status(404).json({ status: 'error', message: 'Log entry not found' });
      return;
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── Protected write routes ────────────────────────────────────────────────────

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { action, table_name, resource_id, event_details, ip_address } = req.body;
    const result = await query(
      `INSERT INTO audit_logs (action, table_name, resource_id, event_details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [action, table_name, resource_id, JSON.stringify(event_details || {}), ip_address],
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

export default router;
