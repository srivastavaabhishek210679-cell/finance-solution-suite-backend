import { Request, Response } from 'express';
import pool from '../config/database';

// ─────────────────────────────────────────────────────────────
// ComplianceCalendarController
// Handles /api/v1/compliance-calendar with graceful fallbacks
// ─────────────────────────────────────────────────────────────
export class ComplianceCalendarController {

  /**
   * GET /api/v1/compliance-calendar
   * Returns all compliance events — gracefully handles missing table
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const limit  = Math.min(parseInt(req.query.limit  as string) || 100, 500);
    const page   = Math.max(parseInt(req.query.page   as string) || 1, 1);
    const offset = (page - 1) * limit;

    try {
      // Try the compliance_calendar table first
      const result = await pool.query(`
        SELECT *
        FROM compliance_calendar
        ORDER BY
          COALESCE(due_date, event_date, scheduled_date, created_at) ASC NULLS LAST
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      const countResult = await pool.query('SELECT COUNT(*) FROM compliance_calendar');
      const total       = parseInt(countResult.rows[0].count);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });

    } catch (primaryError: any) {
      console.warn('compliance_calendar query failed:', primaryError.message);

      // ── Fallback: try compliance_submissions table ──────────
      try {
        const fallback = await pool.query(`
          SELECT
            submission_id  AS event_id,
            report_name    AS title,
            due_date,
            status,
            'Compliance'   AS category,
            'medium'       AS priority
          FROM compliance_submissions
          ORDER BY due_date ASC NULLS LAST
          LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const fbCount = await pool.query('SELECT COUNT(*) FROM compliance_submissions');
        const total   = parseInt(fbCount.rows[0].count);

        res.json({
          data: fallback.rows,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });

      } catch (fallbackError: any) {
        console.warn('Fallback compliance query also failed:', fallbackError.message);
        // Return empty — frontend has its own fallback mock data
        res.json({
          data: [],
          pagination: { page: 1, limit, total: 0, totalPages: 0 },
        });
      }
    }
  }

  /**
   * GET /api/v1/compliance-calendar/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT * FROM compliance_calendar WHERE event_id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Compliance calendar getById error:', error.message);
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  }

  /**
   * POST /api/v1/compliance-calendar
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        title, category, due_date, status = 'upcoming',
        priority = 'medium', description, assigned_to, tenant_id,
      } = req.body;

      const result = await pool.query(`
        INSERT INTO compliance_calendar
          (title, category, due_date, status, priority, description, assigned_to, tenant_id, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
        RETURNING *
      `, [title, category, due_date, status, priority, description, assigned_to, tenant_id]);

      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error('Compliance calendar create error:', error.message);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }

  /**
   * PUT /api/v1/compliance-calendar/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id }  = req.params;
      const updates = req.body;
      const fields  = Object.keys(updates).filter(k => k !== 'event_id');

      if (fields.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      const values    = [id, ...fields.map(f => updates[f])];

      const result = await pool.query(
        `UPDATE compliance_calendar SET ${setClause}, updated_at = NOW() WHERE event_id = $1 RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Compliance calendar update error:', error.message);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }

  /**
   * DELETE /api/v1/compliance-calendar/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'DELETE FROM compliance_calendar WHERE event_id = $1 RETURNING event_id',
        [id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
      res.json({ message: 'Event deleted', event_id: result.rows[0].event_id });
    } catch (error: any) {
      console.error('Compliance calendar delete error:', error.message);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  }
}
