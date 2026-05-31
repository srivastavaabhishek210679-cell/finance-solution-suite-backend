import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const collaborationController = {
  getRooms: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const result = await pool.query(
      `SELECT r.*, COUNT(c.comment_id) as comment_count FROM collaboration_rooms r LEFT JOIN collaboration_comments c ON r.room_id = c.room_id WHERE r.tenant_id = $1 AND r.is_active = true GROUP BY r.room_id ORDER BY r.updated_at DESC`,
      [tenantId]
    );
    res.json({ status: 'success', data: result.rows });
  },

  createRoom: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const userId = authReq.user?.userId;
    const { name, description } = req.body;
    const result = await pool.query(
      'INSERT INTO collaboration_rooms (tenant_id, name, owner_id, description) VALUES ($1,$2,$3,$4) RETURNING *',
      [tenantId, name, userId, description || '']
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  },

  getComments: async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const result = await pool.query(
      'SELECT * FROM collaboration_comments WHERE room_id = $1 ORDER BY created_at ASC',
      [roomId]
    );
    res.json({ status: 'success', data: result.rows });
  },

  addComment: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const userId = authReq.user?.userId;
    const { roomId } = req.params;
    const { content, parent_id } = req.body;
    const userName = authReq.user?.firstName + ' ' + authReq.user?.lastName;
    const result = await pool.query(
      'INSERT INTO collaboration_comments (room_id, tenant_id, user_id, user_name, content, parent_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [roomId, tenantId, userId, userName, content, parent_id || null]
    );
    await pool.query('UPDATE collaboration_rooms SET updated_at = NOW() WHERE room_id = $1', [roomId]);
    res.status(201).json({ status: 'success', data: result.rows[0] });
  },

  deleteRoom: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const { id } = req.params;
    await pool.query('UPDATE collaboration_rooms SET is_active = false WHERE room_id = $1 AND tenant_id = $2', [id, tenantId]);
    res.json({ status: 'success', message: 'Room deleted' });
  }
};

