import { Request, Response } from 'express';
import pool from '../config/database';

export const performanceController = {
  getReviews: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM performance_reviews ORDER BY created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createReview: async (req: Request, res: Response) => {
    try {
      const { employee_name, department, reviewer, review_period, overall_rating, goals_score, skills_score, attitude_score, leadership_score, status, comments } = req.body;
      const result = await pool.query('INSERT INTO performance_reviews (employee_name, department, reviewer, review_period, overall_rating, goals_score, skills_score, attitude_score, leadership_score, status, comments) VALUES (,,,,,,,,,,) RETURNING *', [employee_name, department, reviewer, review_period, overall_rating||0, goals_score||0, skills_score||0, attitude_score||0, leadership_score||0, status||'Draft', comments]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateReview: async (req: Request, res: Response) => {
    try {
      const { overall_rating, goals_score, skills_score, attitude_score, leadership_score, status, comments } = req.body;
      const result = await pool.query('UPDATE performance_reviews SET overall_rating=, goals_score=, skills_score=, attitude_score=, leadership_score=, status=, comments= WHERE review_id= RETURNING *', [overall_rating, goals_score, skills_score, attitude_score, leadership_score, status, comments, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getGoals: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM performance_goals ORDER BY target_date');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createGoal: async (req: Request, res: Response) => {
    try {
      const { employee_name, department, goal_title, description, target_date } = req.body;
      const result = await pool.query('INSERT INTO performance_goals (employee_name, department, goal_title, description, target_date) VALUES (,,,,) RETURNING *', [employee_name, department, goal_title, description, target_date]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateGoalProgress: async (req: Request, res: Response) => {
    try {
      const { progress, status } = req.body;
      const result = await pool.query('UPDATE performance_goals SET progress=, status= WHERE goal_id= RETURNING *', [progress, status, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total, AVG(overall_rating) as avg_rating FROM performance_reviews');
      const completed = await pool.query("SELECT COUNT(*) as completed FROM performance_reviews WHERE status='Completed'");
      const byDept = await pool.query('SELECT department, AVG(overall_rating) as avg_rating, COUNT(*) as count FROM performance_reviews GROUP BY department ORDER BY avg_rating DESC');
      res.json({ status: 'success', data: { total: total.rows[0].total, avgRating: total.rows[0].avg_rating, completed: completed.rows[0].completed, byDepartment: byDept.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};