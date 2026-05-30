import { Request, Response } from 'express';
import pool from '../config/database';

export const recruitmentController = {
  getJobs: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM job_postings ORDER BY posted_date DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createJob: async (req: Request, res: Response) => {
    try {
      const { job_title, department, location, job_type, experience, salary_range, status, openings, closing_date, description } = req.body;
      const result = await pool.query('INSERT INTO job_postings (job_title, department, location, job_type, experience, salary_range, status, openings, closing_date, description) VALUES (,,,,,,,,,) RETURNING *', [job_title, department, location, job_type||'Full-Time', experience, salary_range, status||'Open', openings||1, closing_date, description]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateJob: async (req: Request, res: Response) => {
    try {
      const { job_title, status, openings, closing_date, description } = req.body;
      const result = await pool.query('UPDATE job_postings SET job_title=, status=, openings=, closing_date=, description= WHERE job_id= RETURNING *', [job_title, status, openings, closing_date, description, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getApplications: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT a.*, j.job_title, j.department FROM job_applications a JOIN job_postings j ON a.job_id=j.job_id ORDER BY a.created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createApplication: async (req: Request, res: Response) => {
    try {
      const { job_id, candidate_name, email, phone, experience_years, current_company, notes } = req.body;
      const result = await pool.query('INSERT INTO job_applications (job_id, candidate_name, email, phone, experience_years, current_company, notes) VALUES (,,,,,,) RETURNING *', [job_id, candidate_name, email, phone, experience_years||0, current_company, notes]);
      await pool.query('UPDATE job_postings SET applications=applications+1 WHERE job_id=', [job_id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateApplicationStatus: async (req: Request, res: Response) => {
    try {
      const { status, interview_date, notes } = req.body;
      const result = await pool.query('UPDATE job_applications SET status=, interview_date=, notes= WHERE application_id= RETURNING *', [status, interview_date, notes, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const jobs = await pool.query('SELECT COUNT(*) as total FROM job_postings');
      const open = await pool.query("SELECT COUNT(*) as open FROM job_postings WHERE status='Open'");
      const apps = await pool.query('SELECT COUNT(*) as total FROM job_applications');
      const byStatus = await pool.query('SELECT status, COUNT(*) as count FROM job_applications GROUP BY status ORDER BY count DESC');
      res.json({ status: 'success', data: { totalJobs: jobs.rows[0].total, openJobs: open.rows[0].open, totalApplications: apps.rows[0].total, byStatus: byStatus.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};