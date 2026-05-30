import { Request, Response } from 'express';
import pool from '../config/database';

export const trainingController = {
  getCourses: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT c.*, COUNT(e.enrollment_id) as enrolled FROM training_courses c LEFT JOIN training_enrollments e ON c.course_id=e.course_id GROUP BY c.course_id ORDER BY c.start_date');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createCourse: async (req: Request, res: Response) => {
    try {
      const { course_name, category, instructor, duration_hours, mode, max_participants, start_date, end_date, description } = req.body;
      const result = await pool.query('INSERT INTO training_courses (course_name, category, instructor, duration_hours, mode, max_participants, start_date, end_date, description) VALUES (,,,,,,,,) RETURNING *', [course_name, category, instructor, duration_hours||0, mode||'Online', max_participants||30, start_date, end_date, description]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getEnrollments: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT e.*, c.course_name, c.category FROM training_enrollments e JOIN training_courses c ON e.course_id=c.course_id ORDER BY e.created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  enroll: async (req: Request, res: Response) => {
    try {
      const { course_id, employee_name, department } = req.body;
      const result = await pool.query('INSERT INTO training_enrollments (course_id, employee_name, department) VALUES (,,) RETURNING *', [course_id, employee_name, department]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateEnrollment: async (req: Request, res: Response) => {
    try {
      const { status, score, completion_date, certificate_issued } = req.body;
      const result = await pool.query('UPDATE training_enrollments SET status=, score=, completion_date=, certificate_issued= WHERE enrollment_id= RETURNING *', [status, score, completion_date, certificate_issued||false, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const courses = await pool.query('SELECT COUNT(*) as total FROM training_courses');
      const enrollments = await pool.query('SELECT COUNT(*) as total FROM training_enrollments');
      const completed = await pool.query("SELECT COUNT(*) as completed FROM training_enrollments WHERE status='Completed'");
      const certs = await pool.query('SELECT COUNT(*) as certs FROM training_enrollments WHERE certificate_issued=true');
      res.json({ status: 'success', data: { totalCourses: courses.rows[0].total, totalEnrollments: enrollments.rows[0].total, completed: completed.rows[0].completed, certificates: certs.rows[0].certs } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};