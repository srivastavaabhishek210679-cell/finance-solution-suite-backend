import { Request, Response } from 'express';
import pool from '../config/database';

// ─────────────────────────────────────────────────────────────
// WorkflowController
// Handles /workflow-definitions and /workflow-instances
// ─────────────────────────────────────────────────────────────
export class WorkflowController {

  // ── WORKFLOW DEFINITIONS ─────────────────────────────────

  /**
   * GET /api/v1/workflow-definitions
   */
  async getAllDefinitions(req: Request, res: Response): Promise<void> {
    const limit  = Math.min(parseInt(req.query.limit  as string) || 100, 500);
    const page   = Math.max(parseInt(req.query.page   as string) || 1, 1);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    try {
      const whereClause = status ? `WHERE status = $3` : '';
      const params: any[] = status
        ? [limit, offset, status]
        : [limit, offset];

      const result = await pool.query(`
        SELECT
          workflow_id,
          name,
          description,
          status,
          category,
          trigger_type,
          trigger_config,
          schedule_cron,
          last_run_at,
          next_run_at,
          run_count,
          success_count,
          created_at,
          updated_at,
          created_by,
          tenant_id
        FROM workflow_definitions
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, params);

      const countResult = await pool.query(
        status
          ? 'SELECT COUNT(*) FROM workflow_definitions WHERE status = $1'
          : 'SELECT COUNT(*) FROM workflow_definitions',
        status ? [status] : []
      );
      const total = parseInt(countResult.rows[0].count);

      // Enrich with computed success rate
      const enriched = result.rows.map(w => ({
        ...w,
        successRate: w.run_count > 0
          ? parseFloat(((w.success_count / w.run_count) * 100).toFixed(1))
          : 0,
      }));

      res.json({
        data: enriched,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });

    } catch (error: any) {
      console.error('workflow_definitions query error:', error.message);
      res.json({ data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
    }
  }

  /**
   * GET /api/v1/workflow-definitions/:id
   */
  async getDefinitionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT * FROM workflow_definitions WHERE workflow_id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('workflow getById error:', error.message);
      res.status(500).json({ error: 'Failed to fetch workflow' });
    }
  }

  /**
   * POST /api/v1/workflow-definitions
   */
  async createDefinition(req: Request, res: Response): Promise<void> {
    try {
      const {
        name, description, category = 'General',
        trigger_type = 'manual', trigger_config = {},
        schedule_cron, status = 'active',
        tenant_id, created_by,
      } = req.body;

      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }

      const result = await pool.query(`
        INSERT INTO workflow_definitions
          (name, description, category, trigger_type, trigger_config,
           schedule_cron, status, run_count, success_count,
           tenant_id, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$8,$9,NOW(),NOW())
        RETURNING *
      `, [name, description, category, trigger_type,
          JSON.stringify(trigger_config), schedule_cron,
          status, tenant_id, created_by]);

      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error('workflow create error:', error.message);
      res.status(500).json({ error: 'Failed to create workflow' });
    }
  }

  /**
   * PUT /api/v1/workflow-definitions/:id
   * Also handles pause/resume via status field
   */
  async updateDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { id }  = req.params;
      const updates = req.body;

      const allowed = ['name','description','category','trigger_type',
                       'trigger_config','schedule_cron','status','next_run_at'];
      const fields  = Object.keys(updates).filter(k => allowed.includes(k));

      if (fields.length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
      }

      const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      const values    = [id, ...fields.map(f => updates[f])];

      const result = await pool.query(
        `UPDATE workflow_definitions
         SET ${setClause}, updated_at = NOW()
         WHERE workflow_id = $1
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('workflow update error:', error.message);
      res.status(500).json({ error: 'Failed to update workflow' });
    }
  }

  /**
   * DELETE /api/v1/workflow-definitions/:id
   */
  async deleteDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'DELETE FROM workflow_definitions WHERE workflow_id = $1 RETURNING workflow_id',
        [id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      res.json({ message: 'Workflow deleted', workflow_id: result.rows[0].workflow_id });
    } catch (error: any) {
      console.error('workflow delete error:', error.message);
      res.status(500).json({ error: 'Failed to delete workflow' });
    }
  }

  /**
   * POST /api/v1/workflow-definitions/:id/toggle
   * Toggle active ↔ paused
   */
  async toggleDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `UPDATE workflow_definitions
         SET status = CASE WHEN status = 'active' THEN 'paused' ELSE 'active' END,
             updated_at = NOW()
         WHERE workflow_id = $1
         RETURNING *`,
        [id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('workflow toggle error:', error.message);
      res.status(500).json({ error: 'Failed to toggle workflow' });
    }
  }

  // ── WORKFLOW INSTANCES ───────────────────────────────────

  /**
   * GET /api/v1/workflow-instances
   */
  async getAllInstances(req: Request, res: Response): Promise<void> {
    const limit      = Math.min(parseInt(req.query.limit       as string) || 50, 500);
    const page       = Math.max(parseInt(req.query.page        as string) || 1, 1);
    const offset     = (page - 1) * limit;
    const workflowId = req.query.workflow_id as string;

    try {
      const whereClause = workflowId ? 'WHERE wi.workflow_id = $3' : '';
      const params: any[] = workflowId
        ? [limit, offset, workflowId]
        : [limit, offset];

      const result = await pool.query(`
        SELECT
          wi.instance_id,
          wi.workflow_id,
          wd.name          AS workflow_name,
          wd.category,
          wi.status,
          wi.started_at,
          wi.completed_at,
          wi.error_message,
          wi.created_at,
          EXTRACT(EPOCH FROM (
            COALESCE(wi.completed_at, NOW()) - wi.started_at
          ))::integer      AS duration_seconds
        FROM workflow_instances wi
        LEFT JOIN workflow_definitions wd ON wi.workflow_id = wd.workflow_id
        ${whereClause}
        ORDER BY wi.created_at DESC
        LIMIT $1 OFFSET $2
      `, params);

      const countResult = await pool.query(
        workflowId
          ? 'SELECT COUNT(*) FROM workflow_instances WHERE workflow_id = $1'
          : 'SELECT COUNT(*) FROM workflow_instances',
        workflowId ? [workflowId] : []
      );
      const total = parseInt(countResult.rows[0].count);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });

    } catch (error: any) {
      console.error('workflow_instances query error:', error.message);
      res.json({ data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
    }
  }

  /**
   * GET /api/v1/workflow-instances/:id
   */
  async getInstanceById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT wi.*, wd.name AS workflow_name
         FROM workflow_instances wi
         LEFT JOIN workflow_definitions wd ON wi.workflow_id = wd.workflow_id
         WHERE wi.instance_id = $1`,
        [id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Instance not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('instance getById error:', error.message);
      res.status(500).json({ error: 'Failed to fetch instance' });
    }
  }

  /**
   * GET /api/v1/workflow-definitions/:id/stats
   * Run history stats for a specific workflow
   */
  async getDefinitionStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const stats = await pool.query(`
        SELECT
          COUNT(*)                                          AS total_runs,
          COUNT(*) FILTER (WHERE status = 'completed')     AS successful,
          COUNT(*) FILTER (WHERE status = 'failed')        AS failed,
          COUNT(*) FILTER (WHERE status = 'running')       AS running,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))::integer AS avg_duration_seconds,
          MAX(started_at)                                   AS last_run_at
        FROM workflow_instances
        WHERE workflow_id = $1
      `, [id]);

      const row = stats.rows[0];
      res.json({
        totalRuns:          parseInt(row.total_runs),
        successful:         parseInt(row.successful),
        failed:             parseInt(row.failed),
        running:            parseInt(row.running),
        avgDurationSeconds: row.avg_duration_seconds || 0,
        lastRunAt:          row.last_run_at,
        successRate:        row.total_runs > 0
          ? parseFloat(((row.successful / row.total_runs) * 100).toFixed(1))
          : 0,
      });
    } catch (error: any) {
      console.error('workflow stats error:', error.message);
      res.status(500).json({ error: 'Failed to fetch workflow stats' });
    }
  }

  /**
   * GET /api/v1/workflow-definitions/summary
   * Dashboard summary — active count, recent runs, success rate
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const defStats = await pool.query(`
        SELECT
          COUNT(*)                                             AS total,
          COUNT(*) FILTER (WHERE status = 'active')           AS active,
          COUNT(*) FILTER (WHERE status = 'paused')           AS paused
        FROM workflow_definitions
      `);

      const instStats = await pool.query(`
        SELECT
          COUNT(*)                                             AS total_runs,
          COUNT(*) FILTER (WHERE status = 'completed')        AS successful,
          COUNT(*) FILTER (WHERE status = 'failed')           AS failed,
          COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '24 hours') AS runs_today
        FROM workflow_instances
      `);

      const d = defStats.rows[0];
      const i = instStats.rows[0];

      res.json({
        totalWorkflows:  parseInt(d.total),
        activeWorkflows: parseInt(d.active),
        pausedWorkflows: parseInt(d.paused),
        totalRuns:       parseInt(i.total_runs),
        successfulRuns:  parseInt(i.successful),
        failedRuns:      parseInt(i.failed),
        runsToday:       parseInt(i.runs_today),
        overallSuccessRate: i.total_runs > 0
          ? parseFloat(((i.successful / i.total_runs) * 100).toFixed(1))
          : 0,
      });
    } catch (error: any) {
      console.error('workflow summary error:', error.message);
      res.json({
        totalWorkflows: 0, activeWorkflows: 0, pausedWorkflows: 0,
        totalRuns: 0, successfulRuns: 0, failedRuns: 0,
        runsToday: 0, overallSuccessRate: 0,
      });
    }
  }
}
