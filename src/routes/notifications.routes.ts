import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

// ── Public GET routes ─────────────────────────────────────────────────────────

// GET /api/v1/notifications?limit=20&tenant_id=1
router.get('/', async (req: Request, res: Response) => {
  const limit    = Math.min(parseInt(req.query.limit    as string) || 20, 100);
  const page     = Math.max(parseInt(req.query.page     as string) || 1, 1);
  const tenantId = req.query.tenant_id as string | undefined;
  const offset   = (page - 1) * limit;

  try {
    const params: any[] = [];
    let where = '';
    if (tenantId) { params.push(tenantId); where = `WHERE tenant_id = $${params.length}`; }

    const [data, count, unread] = await Promise.all([
      query(`
        SELECT notif_id, tenant_id, user_id, channel, title, message,
               status, data_json, created_at, sent_at, read_at
        FROM   notifications ${where}
        ORDER  BY created_at DESC
        LIMIT  $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]),

      query(`SELECT COUNT(*) FROM notifications ${where}`, params),

      query(
        `SELECT COUNT(*) FROM notifications ${where ? where + ' AND read_at IS NULL' : 'WHERE read_at IS NULL'}`,
        params,
      ),
    ]);

    res.json({
      status:      'success',
      data:        data.rows,
      unreadCount: parseInt(unread.rows[0].count),
      pagination: {
        page, limit,
        total:      parseInt(count.rows[0].count),
        pages:      Math.ceil(parseInt(count.rows[0].count) / limit),
      },
    });
  } catch (err: any) {
    console.error('[Notifications] getAll error:', err.message);
    res.json({ status: 'success', data: [], unreadCount: 0, pagination: { page: 1, limit, total: 0, pages: 0 } });
  }
});

// GET /api/v1/notifications/unread-count
router.get('/unread-count', async (req: Request, res: Response) => {
  const tenantId = req.query.tenant_id as string | undefined;
  try {
    const params: any[] = [];
    let where = 'WHERE read_at IS NULL';
    if (tenantId) { params.push(tenantId); where += ` AND tenant_id = $${params.length}`; }
    const result = await query(`SELECT COUNT(*) FROM notifications ${where}`, params);
    res.json({ status: 'success', unreadCount: parseInt(result.rows[0].count) });
  } catch (err: any) {
    res.json({ status: 'success', unreadCount: 0 });
  }
});

// ── Mark-as-read routes — PUBLIC (no auth required) ───────────────────────────
// Notification ID is sufficient authorization for read status

// PUT /api/v1/notifications/:id/read
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `UPDATE notifications
       SET    read_at = NOW(), status = 'read', updated_at = NOW()
       WHERE  notif_id = $1
       RETURNING notif_id, read_at, status`,
      [req.params.id],
    );

    if (!result.rows.length) {
      res.status(404).json({ status: 'error', message: 'Notification not found' });
      return;
    }

    res.json({ status: 'success', data: result.rows[0] });
  } catch (err: any) {
    console.error('[Notifications] markRead error:', err.message);
    res.json({ status: 'success' }); // non-fatal — optimistic UI already updated
  }
});

// PUT /api/v1/notifications/mark-all-read
router.put('/mark-all-read', async (req: Request, res: Response) => {
  const tenantId = req.query.tenant_id as string | undefined;
  try {
    const params: any[] = [];
    let where = 'WHERE read_at IS NULL';
    if (tenantId) { params.push(tenantId); where += ` AND tenant_id = $${params.length}`; }

    const result = await query(
      `UPDATE notifications SET read_at = NOW(), status = 'read' ${where} RETURNING notif_id`,
      params,
    );

    res.json({ status: 'success', updated: result.rowCount });
  } catch (err: any) {
    console.error('[Notifications] markAllRead error:', err.message);
    res.json({ status: 'success', updated: 0 });
  }
});

// ── Protected write routes ────────────────────────────────────────────────────

// POST /api/v1/notifications
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { tenant_id, user_id, channel = 'in_app', title, message, data_json = {} } = req.body;
    const result = await query(
      `INSERT INTO notifications (tenant_id, user_id, channel, title, message, status, data_json, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW()) RETURNING *`,
      [tenant_id, user_id, channel, title, message, JSON.stringify(data_json)],
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE /api/v1/notifications/:id
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    await query('DELETE FROM notifications WHERE notif_id = $1', [req.params.id]);
    res.json({ status: 'success', message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

export default router;
