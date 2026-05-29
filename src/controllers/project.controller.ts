import { Request, Response } from 'express';
import pool from '../config/database';

export const projectController = {
  getProjects: async (req: Request, res: Response) => {
    try {
      const result = await pool.query("SELECT p.*, COUNT(t.task_id) as total_tasks, COUNT(CASE WHEN t.status='Done' THEN 1 END) as completed_tasks FROM pm_projects p LEFT JOIN pm_tasks t ON p.project_id=t.project_id GROUP BY p.project_id ORDER BY p.created_at DESC");
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  createProject: async (req: Request, res: Response) => {
    try {
      const { project_name, project_code, description, client, project_manager, department, start_date, end_date, status, priority, budget } = req.body;
      const result = await pool.query('INSERT INTO pm_projects (project_name, project_code, description, client, project_manager, department, start_date, end_date, status, priority, budget) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *', [project_name, project_code, description, client, project_manager, department, start_date, end_date, status||'Planning', priority||'Medium', budget||0]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateProject: async (req: Request, res: Response) => {
    try {
      const { project_name, description, client, project_manager, status, priority, budget, spent, progress } = req.body;
      const result = await pool.query('UPDATE pm_projects SET project_name=$1, description=$2, client=$3, project_manager=$4, status=$5, priority=$6, budget=$7, spent=$8, progress=$9, updated_at=NOW() WHERE project_id=$10 RETURNING *', [project_name, description, client, project_manager, status, priority, budget, spent||0, progress||0, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  deleteProject: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM pm_projects WHERE project_id=$1', [req.params.id]);
      res.json({ status: 'success', message: 'Project deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getTasks: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM pm_tasks WHERE project_id=$1 ORDER BY created_at DESC', [req.params.projectId]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  createTask: async (req: Request, res: Response) => {
    try {
      const { project_id, task_name, description, assigned_to, status, priority, due_date, estimated_hours, tags } = req.body;
      const result = await pool.query('INSERT INTO pm_tasks (project_id, task_name, description, assigned_to, status, priority, due_date, estimated_hours, tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [project_id, task_name, description, assigned_to, status||'Todo', priority||'Medium', due_date, estimated_hours||0, JSON.stringify(tags||[])]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateTask: async (req: Request, res: Response) => {
    try {
      const { task_name, assigned_to, status, priority, due_date, estimated_hours, actual_hours } = req.body;
      const result = await pool.query('UPDATE pm_tasks SET task_name=$1, assigned_to=$2, status=$3, priority=$4, due_date=$5, estimated_hours=$6, actual_hours=$7, updated_at=NOW() WHERE task_id=$8 RETURNING *', [task_name, assigned_to, status, priority, due_date, estimated_hours||0, actual_hours||0, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  deleteTask: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM pm_tasks WHERE task_id=$1', [req.params.id]);
      res.json({ status: 'success', message: 'Task deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getMilestones: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM pm_milestones WHERE project_id=$1 ORDER BY due_date', [req.params.projectId]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  createMilestone: async (req: Request, res: Response) => {
    try {
      const { project_id, milestone_name, due_date, status, description } = req.body;
      const result = await pool.query('INSERT INTO pm_milestones (project_id, milestone_name, due_date, status, description) VALUES ($1,$2,$3,$4,$5) RETURNING *', [project_id, milestone_name, due_date, status||'Pending', description]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateMilestone: async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const result = await pool.query('UPDATE pm_milestones SET status=$1 WHERE milestone_id=$2 RETURNING *', [status, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total FROM pm_projects');
      const active = await pool.query("SELECT COUNT(*) as active FROM pm_projects WHERE status='In Progress'");
      const completed = await pool.query("SELECT COUNT(*) as completed FROM pm_projects WHERE status='Completed'");
      const budget = await pool.query('SELECT SUM(budget) as total_budget, SUM(spent) as total_spent FROM pm_projects');
      res.json({ status: 'success', data: { totalProjects: total.rows[0].total, activeProjects: active.rows[0].active, completedProjects: completed.rows[0].completed, totalBudget: budget.rows[0].total_budget, totalSpent: budget.rows[0].total_spent } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};