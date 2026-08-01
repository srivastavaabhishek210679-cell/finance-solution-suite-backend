import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const projectController = {
  getProjects: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM projects WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as active, COUNT(CASE WHEN status=$2 THEN 1 END) as completed, COALESCE(SUM(budget),0) as total_budget FROM projects WHERE tenant_id=$3',
        ['Active', 'Completed', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createProject: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { project_name, project_code, client, department, start_date, end_date, status, priority, budget, description } = req.body;
      const result = await pool.query(
        'INSERT INTO projects (tenant_id,project_name,project_code,client,department,start_date,end_date,status,priority,budget,description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
        [db.id, project_name, project_code, client, department, start_date, end_date, status||'Active', priority||'Medium', budget||0, description]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateProject: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { project_name, client, status, priority, budget, progress, end_date } = req.body;
      const result = await pool.query(
        'UPDATE projects SET project_name=$1,client=$2,status=$3,priority=$4,budget=$5,progress=$6,end_date=$7,updated_at=NOW() WHERE project_id=$8 AND tenant_id=$9 RETURNING *',
        [project_name, client, status, priority, budget, progress||0, end_date, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  deleteProject: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM projects WHERE project_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getTasks: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT * FROM project_tasks WHERE project_id=$1 AND tenant_id=$2 ORDER BY created_at DESC',
        [req.params.projectId, db.id]
      );
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createTask: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { project_id, task_name, assigned_to, due_date, priority, status, description } = req.body;
      const result = await pool.query(
        'INSERT INTO project_tasks (tenant_id,project_id,task_name,assigned_to,due_date,priority,status,description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
        [db.id, project_id, task_name, assigned_to, due_date, priority||'Medium', status||'To Do', description]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateTask: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { status, assigned_to, due_date, priority } = req.body;
      const result = await pool.query(
        'UPDATE project_tasks SET status=$1,assigned_to=$2,due_date=$3,priority=$4,updated_at=NOW() WHERE task_id=$5 AND tenant_id=$6 RETURNING *',
        [status, assigned_to, due_date, priority, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  deleteTask: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM project_tasks WHERE task_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getMilestones: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT * FROM project_milestones WHERE project_id=$1 AND tenant_id=$2 ORDER BY due_date',
        [req.params.projectId, db.id]
      );
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createMilestone: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { project_id, milestone_name, due_date, status } = req.body;
      const result = await pool.query(
        'INSERT INTO project_milestones (tenant_id,project_id,milestone_name,due_date,status) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [db.id, project_id, milestone_name, due_date, status||'Pending']
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateMilestone: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { status, due_date } = req.body;
      const result = await pool.query(
        'UPDATE project_milestones SET status=$1,due_date=$2 WHERE milestone_id=$3 AND tenant_id=$4 RETURNING *',
        [status, due_date, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};

export const projectFeaturesController = {
  getTeamMembers: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM project_team WHERE project_id=$1 AND tenant_id=$2', [req.params.projectId, db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.json({ status: 'success', data: [] }); }
  },
  addTeamMember: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { project_id, member_name, role } = req.body;
      const result = await pool.query(
        'INSERT INTO project_team (tenant_id,project_id,member_name,role) VALUES ($1,$2,$3,$4) RETURNING *',
        [db.id, project_id, member_name, role]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  removeTeamMember: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM project_team WHERE id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Removed' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getComments: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM project_comments WHERE project_id=$1 AND tenant_id=$2 ORDER BY created_at DESC', [req.params.projectId, db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.json({ status: 'success', data: [] }); }
  },
  addComment: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { project_id, comment, author } = req.body;
      const result = await pool.query(
        'INSERT INTO project_comments (tenant_id,project_id,comment,author) VALUES ($1,$2,$3,$4) RETURNING *',
        [db.id, project_id, comment, author]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  deleteComment: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM project_comments WHERE id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getAttachments: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM project_attachments WHERE project_id=$1 AND tenant_id=$2', [req.params.projectId, db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.json({ status: 'success', data: [] }); }
  },
  addAttachment: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { project_id, file_name, file_url, uploaded_by } = req.body;
      const result = await pool.query(
        'INSERT INTO project_attachments (tenant_id,project_id,file_name,file_url,uploaded_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [db.id, project_id, file_name, file_url, uploaded_by]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  deleteAttachment: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM project_attachments WHERE id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateBudget: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { budget, spent } = req.body;
      const result = await pool.query(
        'UPDATE projects SET budget=$1,spent=$2,updated_at=NOW() WHERE project_id=$3 AND tenant_id=$4 RETURNING *',
        [budget, spent, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
