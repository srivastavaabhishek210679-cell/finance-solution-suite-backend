import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

export const tenantMiddleware = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next();
    const userId = req.user.userId;
    const result = await pool.query('SELECT tenant_id FROM users WHERE user_id=$1', [userId]);
    if (result.rows.length) {
      req.tenantId = result.rows[0].tenant_id || 1;
    } else {
      req.tenantId = 1;
    }
    next();
  } catch (e) {
    req.tenantId = 1;
    next();
  }
};