import { Request, Response } from 'express';
import pool from '../config/database';

export const resourceController = {
  getResources: async (req: Request, res: Response) => {
    try {
      const result = await pool.query("SELECT r.*, COUNT(ra.allocation_id) as active_projects FROM resources r LEFT JOIN resource_allocations ra ON r.resource_id = ra.resource_id AND ra.status='Active' GROUP BY r.resource_id ORDER BY r.name");
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  createResource: async (req: Request, res: Response) => {
    try {
      const { name, email, role, department, skills, availability_percent, hourly_rate, status, location } = req.body;
      const result = await pool.query('INSERT INTO resources (name, email, role, department, skills, availability_percent, hourly_rate, status, location) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [name, email, role, department, JSON.stringify(skills||[]), availability_percent||100, hourly_rate||0, status||'Available', location]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateResource: async (req: Request, res: Response) => {
    try {
      const { name, email, role, department, skills, availability_percent, hourly_rate, status, location } = req.body;
      const result = await pool.query('UPDATE resources SET name=$1, email=$2, role=$3, department=$4, skills=$5, availability_percent=$6, hourly_rate=$7, status=$8, location=$9 WHERE resource_id=$10 RETURNING *', [name, email, role, department, JSON.stringify(skills||[]), availability_percent, hourly_rate, status, location, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getProjects: async (req: Request, res: Response) => {
    try {
      const result = await pool.query("SELECT p.*, COUNT(ra.allocation_id) as team_size FROM projects p LEFT JOIN resource_allocations ra ON p.project_id = ra.project_id AND ra.status='Active' GROUP BY p.project_id ORDER BY p.start_date DESC");
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  createProject: async (req: Request, res: Response) => {
    try {
      const { project_name, project_code, client, start_date, end_date, status, priority, budget, department, description } = req.body;
      const result = await pool.query('INSERT INTO projects (project_name, project_code, client, start_date, end_date, status, priority, budget, department, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *', [project_name, project_code, client, start_date, end_date, status||'Active', priority||'Medium', budget||0, department, description]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateProject: async (req: Request, res: Response) => {
    try {
      const { project_name, client, start_date, end_date, status, priority, budget } = req.body;
      const result = await pool.query('UPDATE projects SET project_name=$1, client=$2, start_date=$3, end_date=$4, status=$5, priority=$6, budget=$7 WHERE project_id=$8 RETURNING *', [project_name, client, start_date, end_date, status, priority, budget, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getAllocations: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT ra.*, r.name as resource_name, r.role, r.department, p.project_name FROM resource_allocations ra JOIN resources r ON ra.resource_id=r.resource_id JOIN projects p ON ra.project_id=p.project_id ORDER BY ra.created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  createAllocation: async (req: Request, res: Response) => {
    try {
      const { resource_id, project_id, allocation_percent, start_date, end_date, role_in_project } = req.body;
      const result = await pool.query('INSERT INTO resource_allocations (resource_id, project_id, allocation_percent, start_date, end_date, role_in_project, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [resource_id, project_id, allocation_percent||100, start_date, end_date, role_in_project, 'Active']);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  deleteAllocation: async (req: Request, res: Response) => {
    try {
      await pool.query("UPDATE resource_allocations SET status='Inactive' WHERE allocation_id=$1", [req.params.id]);
      res.json({ status: 'success', message: 'Allocation removed' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total FROM resources');
      const available = await pool.query("SELECT COUNT(*) as available FROM resources WHERE status='Available'");
      const projects = await pool.query("SELECT COUNT(*) as total FROM projects WHERE status='Active'");
      const deptBreakdown = await pool.query('SELECT department, COUNT(*) as count, AVG(availability_percent) as avg_availability FROM resources GROUP BY department ORDER BY count DESC');
      res.json({ status: 'success', data: { totalResources: total.rows[0].total, availableResources: available.rows[0].available, activeProjects: projects.rows[0].total, departmentBreakdown: deptBreakdown.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};


