import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const preferencesController = {
  get: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const tenantId = authReq.user?.tenantId;
    const result = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.json({ status: 'success', data: null });
    }
    res.json({ status: 'success', data: result.rows[0] });
  },

  save: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const tenantId = authReq.user?.tenantId;
    const { layout_prefs, notification_prefs, theme_prefs, favorite_reports, domain_priorities } = req.body;
    const result = await pool.query(
      INSERT INTO user_preferences (user_id, tenant_id, layout_prefs, notification_prefs, theme_prefs, favorite_reports, domain_priorities)
       VALUES (\, \, \, \, \, \, \)
       ON CONFLICT (user_id) DO UPDATE SET
         layout_prefs = EXCLUDED.layout_prefs,
         notification_prefs = EXCLUDED.notification_prefs,
         theme_prefs = EXCLUDED.theme_prefs,
         favorite_reports = EXCLUDED.favorite_reports,
         domain_priorities = EXCLUDED.domain_priorities,
         updated_at = NOW()
       RETURNING *,
      [userId, tenantId,
       JSON.stringify(layout_prefs || {}),
       JSON.stringify(notification_prefs || {}),
       JSON.stringify(theme_prefs || {}),
       JSON.stringify(favorite_reports || []),
       JSON.stringify(domain_priorities || [])]
    );
    res.json({ status: 'success', data: result.rows[0] });
  }
};
