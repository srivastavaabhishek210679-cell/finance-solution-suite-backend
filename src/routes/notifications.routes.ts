import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

router.use(authenticate);

// Get all notifications
router.get('/', async (req: any, res: any) => {
  const { tenantId } = req.user;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  const result = await query(
    'SELECT * FROM notifications WHERE tenant_id = $1 ORDER BY notif_id DESC LIMIT $2 OFFSET $3',
    [tenantId, limit, offset]
  );

  const countResult = await query(
    'SELECT COUNT(*) FROM notifications WHERE tenant_id = $1',
    [tenantId]
  );

  res.json({
    status: 'success',
    data: result.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      pages: Math.ceil(countResult.rows[0].count / limit),
    },
  });
});

// Get by ID
router.get('/:id', async (req: any, res: any) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const result = await query(
    'SELECT * FROM notifications WHERE notif_id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }

  res.json({ status: 'success', data: result.rows[0] });
});

// Create
router.post('/', async (req: any, res: any) => {
  const { tenantId, userId } = req.user;
  const { channel, title, message, status, data_json } = req.body;

  const result = await query(
    `INSERT INTO notifications (tenant_id, user_id, channel, title, message, status, data_json) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [tenantId, userId, channel || 'in-app', title, message, status || 'pending', data_json || {}]
  );

  res.status(201).json({ status: 'success', data: result.rows[0] });
});

// Update
router.put('/:id', async (req: any, res: any) => {
  const { tenantId } = req.user;
  const { id } = req.params;
  const { status, read_at } = req.body;

  const result = await query(
    `UPDATE notifications SET status = $1, read_at = $2 WHERE notif_id = $3 AND tenant_id = $4 RETURNING *`,
    [status, read_at, id, tenantId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }

  res.json({ status: 'success', data: result.rows[0] });
});

// Delete
router.delete('/:id', async (req: any, res: any) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  const result = await query(
    'DELETE FROM notifications WHERE notif_id = $1 AND tenant_id = $2 RETURNING *',
    [id, tenantId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }

  res.json({ status: 'success', message: 'Deleted successfully' });
});

export default router;