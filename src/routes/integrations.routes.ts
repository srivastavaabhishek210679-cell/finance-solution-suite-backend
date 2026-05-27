import { Router } from 'express';
import pool from '../config/database';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT source_id, source_name, source_type, is_active, connection_status, health_score, last_sync, last_sync_status, last_sync_count, config FROM data_sources ORDER BY source_id');
    res.json({ status: 'success', data: result.rows });
  } catch (e) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch integrations' });
  }
});

export default router;