import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

// ── PUBLIC GET routes (no auth — frontend reads without login) ─

// GET /api/v1/notifications — list all (public, tenant_id=1 default)
router.get('/', async (req: any, res: any) => {
  try {
    const page     = parseInt(req.query.page   as string) || 1;
    const limit    = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset   = (page - 1) * limit;
    const tenantId = req.query.tenant_id || req.user?.tenantId || 1;
    const status   = req.query.status as string;

    const whereExtra = status ? `AND status = '${status}'` : '';

    const result = await query(
      `SELECT notif_id, tenant_id, user_id, channel, title, message,
              status, data_json, created_at, sent_at, read_at
       FROM notifications
       WHERE tenant_id = $1 ${whereExtra}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM notifications WHERE tenant_id = $1 ${whereExtra}`,
      [tenantId]
    );

    const unreadResult = await query(
      `SELECT COUNT(*) FROM notifications WHERE tenant_id = $1 AND read_at IS NULL`,
      [tenantId]
    );

    res.json({
      status: 'success',
      data: result.rows,
      unreadCount: parseInt(unreadResult.rows[0].count),
      pagination: {
        page, limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (error: any) {
    console.error('notifications error:', error.message);
    res.json({ status: 'success', data: [], unreadCount: 0, pagination: { page:1, limit:20, total:0, pages:0 } });
  }
});

// GET /api/v1/notifications/unread-count
router.get('/unread-count', async (req: any, res: any) => {
  try {
    const tenantId = req.query.tenant_id || 1;
    const result = await query(
      `SELECT COUNT(*) AS count FROM notifications WHERE tenant_id = $1 AND read_at IS NULL`,
      [tenantId]
    );
    res.json({ status: 'success', count: parseInt(result.rows[0].count) });
  } catch (error: any) {
    res.json({ status: 'success', count: 0 });
  }
});

// GET /api/v1/notifications/:id
router.get('/:id', async (req: any, res: any) => {
  try {
    const tenantId = req.query.tenant_id || 1;
    const result = await query(
      'SELECT * FROM notifications WHERE notif_id = $1 AND tenant_id = $2',
      [req.params.id, tenantId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Not found' });
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ── Protected write routes ─────────────────────────────────────

// POST /api/v1/notifications
router.post('/', authenticate, async (req: any, res: any) => {
  try {
    const { tenantId, userId } = req.user;
    const { channel, title, message, status, data_json } = req.body;
    const result = await query(
      `INSERT INTO notifications (tenant_id, user_id, channel, title, message, status, data_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [tenantId, userId, channel || 'in_app', title, message, status || 'pending', JSON.stringify(data_json || {})]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// PUT /api/v1/notifications/:id/read — mark one as read
router.put('/:id/read', authenticate, async (req: any, res: any) => {
  try {
    const tenantId = req.user?.tenantId || 1;
    const result = await query(
      `UPDATE notifications SET status = 'read', read_at = NOW()
       WHERE notif_id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, tenantId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Not found' });
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// PUT /api/v1/notifications/mark-all-read — mark all as read
router.put('/mark-all-read', authenticate, async (req: any, res: any) => {
  try {
    const tenantId = req.user?.tenantId || 1;
    const result = await query(
      `UPDATE notifications SET status = 'read', read_at = NOW()
       WHERE tenant_id = $1 AND read_at IS NULL`,
      [tenantId]
    );
    res.json({ status: 'success', updated: result.rowCount });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// PUT /api/v1/notifications/:id — general update
router.put('/:id', authenticate, async (req: any, res: any) => {
  try {
    const tenantId = req.user?.tenantId || 1;
    const { status, read_at } = req.body;
    const result = await query(
      `UPDATE notifications SET status = $1, read_at = $2
       WHERE notif_id = $3 AND tenant_id = $4 RETURNING *`,
      [status, read_at, req.params.id, tenantId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Not found' });
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// DELETE /api/v1/notifications/:id
router.delete('/:id', authenticate, async (req: any, res: any) => {
  try {
    const tenantId = req.user?.tenantId || 1;
    const result = await query(
      'DELETE FROM notifications WHERE notif_id = $1 AND tenant_id = $2 RETURNING *',
      [req.params.id, tenantId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Not found' });
    }
    res.json({ status: 'success', message: 'Deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;
