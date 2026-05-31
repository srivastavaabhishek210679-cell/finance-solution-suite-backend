import { Request, Response } from 'express';
import pool from '../config/database';

export class WorkflowController {

  // ── WORKFLOW DEFINITIONS ─────────────────────────────────

  async getAllDefinitions(req: Request, res: Response): Promise<void> {
    const limit        = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const page         = Math.max(parseInt(req.query.page  as string) || 1, 1);
    const offset       = (page - 1) * limit;
    const statusFilter = req.query.status as string;

    try {
      const whereClause = statusFilter ? `WHERE wd.status = $3` : '';
      const params: any[] = statusFilter ? [limit, offset, statusFilter] : [limit, offset];

      const result = await pool.query(`
        SELECT
          wd.workflow_id, wd.name, wd.description, wd.category,
          wd.trigger_type, wd.schedule_cron, wd.status,
          wd.run_count, wd.success_count, wd.last_run_at,
          wd.next_run_at, wd.created_at, wd.updated_at
        FROM workflow_definitions wd
        ${whereClause}
        ORDER BY wd.created_at DESC
        LIMIT $1 OFFSET $2
      `, params);

      const countResult = await pool.query(
        statusFilter
          ? 'SELECT COUNT(*) FROM workflow_definitions WHERE status = $1'
          : 'SELECT COUNT(*) FROM workflow_definitions',
        statusFilter ? [statusFilter] : []
      );
      const total = parseInt(countResult.rows[0].count);

      const enriched = result.rows.map((w: any) => ({
        ...w,
        successRate: w.run_count > 0
          ? parseFloat(((w.success_count / w.run_count) * 100).toFixed(1)) : 0,
      }));

      res.json({ data: enriched, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error: any) {
      console.error('workflow_definitions query error:', error.message);
      res.json({ data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
    }
  }

  async getDefinitionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT * FROM workflow_definitions WHERE workflow_id = $1', [id]
      );
      if (result.rows.length === 0) { res.status(404).json({ error: 'Workflow not found' }); return; }
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch workflow' });
    }
  }

  async createDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, category = 'General', trigger_type = 'manual',
              schedule_cron, status = 'active', tenant_id, created_by } = req.body;
      if (!name) { res.status(400).json({ error: 'name is required' }); return; }
      const result = await pool.query(`
        INSERT INTO workflow_definitions
          (name, description, category, trigger_type, schedule_cron, status,
           run_count, success_count, is_active, tenant_id, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,0,0,$7,$8,$9,NOW(),NOW()) RETURNING *
      `, [name, description, category, trigger_type, schedule_cron, status,
          status === 'active', tenant_id, created_by]);
      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create workflow' });
    }
  }

  async updateDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      const allowed = ['name','description','category','trigger_type','schedule_cron','status','next_run_at'];
      const fields  = Object.keys(updates).filter(k => allowed.includes(k));
      if (fields.length === 0) { res.status(400).json({ error: 'No valid fields to update' }); return; }
      const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      const values    = [id, ...fields.map(f => updates[f])];
      const result = await pool.query(
        `UPDATE workflow_definitions SET ${setClause}, updated_at = NOW() WHERE workflow_id = $1 RETURNING *`,
        values
      );
      if (result.rows.length === 0) { res.status(404).json({ error: 'Workflow not found' }); return; }
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update workflow' });
    }
  }

  async deleteDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'DELETE FROM workflow_definitions WHERE workflow_id = $1 RETURNING workflow_id', [id]
      );
      if (result.rows.length === 0) { res.status(404).json({ error: 'Workflow not found' }); return; }
      res.json({ message: 'Workflow deleted', workflow_id: result.rows[0].workflow_id });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete workflow' });
    }
  }

  async toggleDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `UPDATE workflow_definitions
         SET status    = CASE WHEN status = 'active' THEN 'paused' ELSE 'active' END,
             is_active = CASE WHEN status = 'active' THEN false ELSE true END,
             updated_at = NOW()
         WHERE workflow_id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) { res.status(404).json({ error: 'Workflow not found' }); return; }
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to toggle workflow' });
    }
  }

  // ── WORKFLOW INSTANCES ───────────────────────────────────
  // Table columns: instance_id, workflow_id, status, context_json,
  //                error_msg, started_at, finished_at

  async getAllInstances(req: Request, res: Response): Promise<void> {
    const limit      = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const page       = Math.max(parseInt(req.query.page  as string) || 1, 1);
    const offset     = (page - 1) * limit;
    const workflowId = req.query.workflow_id as string;

    try {
      const whereClause = workflowId ? 'WHERE wi.workflow_id = $3' : '';
      const params: any[] = workflowId ? [limit, offset, workflowId] : [limit, offset];

      const result = await pool.query(`
        SELECT
          wi.instance_id, wi.workflow_id,
          wd.name          AS workflow_name,
          wd.category,
          wi.status,
          wi.started_at,
          wi.finished_at   AS completed_at,
          wi.error_msg     AS error_message,
          EXTRACT(EPOCH FROM (
            COALESCE(wi.finished_at, NOW()) - wi.started_at
          ))::integer      AS duration_seconds
        FROM workflow_instances wi
        LEFT JOIN workflow_definitions wd ON wi.workflow_id = wd.workflow_id
        ${whereClause}
        ORDER BY wi.started_at DESC
        LIMIT $1 OFFSET $2
      `, params);

      const countResult = await pool.query(
        workflowId
          ? 'SELECT COUNT(*) FROM workflow_instances WHERE workflow_id = $1'
          : 'SELECT COUNT(*) FROM workflow_instances',
        workflowId ? [workflowId] : []
      );
      const total = parseInt(countResult.rows[0].count);

      res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error: any) {
      console.error('workflow_instances query error:', error.message);
      res.json({ data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
    }
  }

  async getInstanceById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT wi.*, wi.finished_at AS completed_at, wi.error_msg AS error_message,
                wd.name AS workflow_name
         FROM workflow_instances wi
         LEFT JOIN workflow_definitions wd ON wi.workflow_id = wd.workflow_id
         WHERE wi.instance_id = $1`, [id]
      );
      if (result.rows.length === 0) { res.status(404).json({ error: 'Instance not found' }); return; }
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch instance' });
    }
  }

  async getDefinitionStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await pool.query(`
        SELECT
          COUNT(*)                                                             AS total_runs,
          COUNT(*) FILTER (WHERE wi.status = 'completed')                     AS successful,
          COUNT(*) FILTER (WHERE wi.status = 'failed')                        AS failed,
          COUNT(*) FILTER (WHERE wi.status = 'running')                       AS running,
          AVG(EXTRACT(EPOCH FROM (wi.finished_at - wi.started_at)))::integer  AS avg_duration_seconds,
          MAX(wi.started_at)                                                   AS last_run_at
        FROM workflow_instances wi
        WHERE wi.workflow_id = $1
      `, [id]);

      const row = stats.rows[0];
      res.json({
        totalRuns:          parseInt(row.total_runs),
        successful:         parseInt(row.successful),
        failed:             parseInt(row.failed),
        running:            parseInt(row.running),
        avgDurationSeconds: row.avg_duration_seconds || 0,
        lastRunAt:          row.last_run_at,
        successRate: parseInt(row.total_runs) > 0
          ? parseFloat(((parseInt(row.successful) / parseInt(row.total_runs)) * 100).toFixed(1)) : 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch workflow stats' });
    }
  }

  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const defStats = await pool.query(`
        SELECT
          COUNT(*)                                              AS total,
          COUNT(*) FILTER (WHERE wd.status = 'active')        AS active,
          COUNT(*) FILTER (WHERE wd.status = 'paused')        AS paused
        FROM workflow_definitions wd
      `);

      const instStats = await pool.query(`
        SELECT
          COUNT(*)                                                              AS total_runs,
          COUNT(*) FILTER (WHERE wi.status = 'completed')                      AS successful,
          COUNT(*) FILTER (WHERE wi.status = 'failed')                         AS failed,
          COUNT(*) FILTER (WHERE wi.started_at >= NOW() - INTERVAL '24 hours') AS runs_today
        FROM workflow_instances wi
      `);

      const d = defStats.rows[0];
      const i = instStats.rows[0];

      res.json({
        totalWorkflows:     parseInt(d.total),
        activeWorkflows:    parseInt(d.active),
        pausedWorkflows:    parseInt(d.paused),
        totalRuns:          parseInt(i.total_runs),
        successfulRuns:     parseInt(i.successful),
        failedRuns:         parseInt(i.failed),
        runsToday:          parseInt(i.runs_today),
        overallSuccessRate: parseInt(i.total_runs) > 0
          ? parseFloat(((parseInt(i.successful) / parseInt(i.total_runs)) * 100).toFixed(1)) : 0,
      });
    } catch (error: any) {
      console.error('workflow summary error:', error.message);
      res.json({ totalWorkflows:0, activeWorkflows:0, pausedWorkflows:0,
                 totalRuns:0, successfulRuns:0, failedRuns:0, runsToday:0, overallSuccessRate:0 });
    }
  }
}

