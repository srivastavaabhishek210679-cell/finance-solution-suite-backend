import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

router.use(authenticate);

// Get all metric definitions
router.get('/', async (req: any, res: any) => {
  const { tenantId } = req.user;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  const result = await query(
    'SELECT * FROM metric_definitions WHERE tenant_id = $1 ORDER BY metric_def_id DESC LIMIT $2 OFFSET $3',
    [tenantId, limit, offset]
  );

  const countResult = await query(
    'SELECT COUNT(*) FROM metric_definitions WHERE tenant_id = $1',
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
    'SELECT * FROM metric_definitions WHERE metric_def_id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }

  res.json({ status: 'success', data: result.rows[0] });
});

// Create
router.post('/', async (req: any, res: any) => {
  const { tenantId } = req.user;
  const { domain_id, metric_name, display_name, description, formula, unit, data_type, category } = req.body;

  const result = await query(
    `INSERT INTO metric_definitions (tenant_id, domain_id, metric_name, display_name, description, formula, unit, data_type, category) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [tenantId, domain_id, metric_name, display_name, description, formula, unit, data_type || 'numeric', category]
  );

  res.status(201).json({ status: 'success', data: result.rows[0] });
});

// Update
router.put('/:id', async (req: any, res: any) => {
  const { tenantId } = req.user;
  const { id } = req.params;
  const { display_name, description, formula, is_active } = req.body;

  const result = await query(
    `UPDATE metric_definitions SET display_name = $1, description = $2, formula = $3, is_active = $4 
     WHERE metric_def_id = $5 AND tenant_id = $6 RETURNING *`,
    [display_name, description, formula, is_active, id, tenantId]
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
    'DELETE FROM metric_definitions WHERE metric_def_id = $1 AND tenant_id = $2 RETURNING *',
    [id, tenantId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }

  res.json({ status: 'success', message: 'Deleted successfully' });
});

export default router;
