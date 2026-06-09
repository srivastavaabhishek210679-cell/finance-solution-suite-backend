import { Request, Response } from 'express';
import pool from '../config/database';

export const payrollController = {
  getEmployees: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM employees ORDER BY employee_code');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getEmployee: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM employees WHERE employee_id = $1', [req.params.id]);
      if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Not found' });
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  createEmployee: async (req: Request, res: Response) => {
    try {
      const { employee_code, first_name, last_name, email, phone, department, designation, employment_type, date_of_joining, date_of_birth, gender, basic_salary, hra, transport_allowance, medical_allowance, other_allowance, pf_deduction, tax_deduction, other_deduction, bank_account, bank_name, pan_number } = req.body;
      const result = await pool.query('INSERT INTO employees (employee_code, first_name, last_name, email, phone, department, designation, employment_type, date_of_joining, date_of_birth, gender, basic_salary, hra, transport_allowance, medical_allowance, other_allowance, pf_deduction, tax_deduction, other_deduction, bank_account, bank_name, pan_number) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING *', [employee_code, first_name, last_name, email, phone, department, designation, employment_type, date_of_joining, date_of_birth, gender, basic_salary, hra, transport_allowance, medical_allowance, other_allowance, pf_deduction, tax_deduction, other_deduction, bank_account, bank_name, pan_number]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateEmployee: async (req: Request, res: Response) => {
    try {
      const { first_name, last_name, email, phone, department, designation, employment_type, basic_salary, hra, transport_allowance, medical_allowance, other_allowance, pf_deduction, tax_deduction, other_deduction, status } = req.body;
      const result = await pool.query('UPDATE employees SET first_name=$1, last_name=$2, email=$3, phone=$4, department=$5, designation=$6, employment_type=$7, basic_salary=$8, hra=$9, transport_allowance=$10, medical_allowance=$11, other_allowance=$12, pf_deduction=$13, tax_deduction=$14, other_deduction=$15, status=$16, updated_at=NOW() WHERE employee_id=$17 RETURNING *', [first_name, last_name, email, phone, department, designation, employment_type, basic_salary, hra, transport_allowance, medical_allowance, other_allowance, pf_deduction, tax_deduction, other_deduction, status, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  deleteEmployee: async (req: Request, res: Response) => {
    try {
      await pool.query('UPDATE employees SET status=$1 WHERE employee_id=$2', ['Inactive', req.params.id]);
      res.json({ status: 'success', message: 'Employee deactivated' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  runPayroll: async (req: Request, res: Response) => {
    try {
      const { month, year } = req.body;
      const employees = await pool.query('SELECT * FROM employees WHERE status = $1', ['Active']);
      let totalGross = 0, totalDeductions = 0, totalNet = 0;
      const payrollRun = await pool.query('INSERT INTO payroll_runs (month, year, total_employees, status) VALUES ($1,$2,$3,$4) RETURNING *', [month, year, employees.rows.length, 'Processing']);
      const payrollId = payrollRun.rows[0].payroll_id;
      for (const emp of employees.rows) {
        const gross = Number(emp.basic_salary)+Number(emp.hra)+Number(emp.transport_allowance)+Number(emp.medical_allowance)+Number(emp.other_allowance);
        const deductions = Number(emp.pf_deduction)+Number(emp.tax_deduction)+Number(emp.other_deduction);
        const net = gross - deductions;
        totalGross += gross; totalDeductions += deductions; totalNet += net;
        await pool.query('INSERT INTO payslips (payroll_id, employee_id, month, year, basic_salary, hra, transport_allowance, medical_allowance, other_allowance, gross_salary, pf_deduction, tax_deduction, other_deduction, total_deductions, net_salary) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)', [payrollId, emp.employee_id, month, year, emp.basic_salary, emp.hra, emp.transport_allowance, emp.medical_allowance, emp.other_allowance, gross, emp.pf_deduction, emp.tax_deduction, emp.other_deduction, deductions, net]);
      }
      await pool.query('UPDATE payroll_runs SET status=$1, total_gross=$2, total_deductions=$3, total_net=$4 WHERE payroll_id=$5', ['Completed', totalGross, totalDeductions, totalNet, payrollId]);
      res.json({ status: 'success', data: { payrollId, totalEmployees: employees.rows.length, totalGross, totalDeductions, totalNet } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getPayrollRuns: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM payroll_runs ORDER BY year DESC, month DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getPayslips: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT p.*, e.first_name, e.last_name, e.employee_code, e.department, e.designation FROM payslips p JOIN employees e ON p.employee_id = e.employee_id WHERE p.payroll_id = $1', [req.params.payrollId]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getStats: async (req: Request, res: Response) => {
    try {
      const empCount = await pool.query('SELECT COUNT(*) FROM employees WHERE status = $1', ['Active']);
      const lastPayroll = await pool.query('SELECT * FROM payroll_runs ORDER BY created_at DESC LIMIT 1');
      const deptCost = await pool.query('SELECT department, SUM(basic_salary + hra + transport_allowance + medical_allowance + other_allowance) as total_cost FROM employees WHERE status=$1 GROUP BY department ORDER BY total_cost DESC', ['Active']);
      res.json({ status: 'success', data: { totalEmployees: empCount.rows[0].count, lastPayroll: lastPayroll.rows[0] || null, departmentCosts: deptCost.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getReportsData: async (req: Request, res: Response) => {
    try {
      const deptSummary = await pool.query('SELECT department, COUNT(*) as count, AVG(basic_salary) as avg_salary, SUM(basic_salary+hra+transport_allowance+medical_allowance+other_allowance) as total_gross FROM employees WHERE status=$1 GROUP BY department ORDER BY total_gross DESC', ['Active']);
      const salaryBands = await pool.query('SELECT designation, COUNT(*) as count, AVG(basic_salary) as avg_salary FROM employees WHERE status=$1 GROUP BY designation ORDER BY avg_salary DESC LIMIT 10', ['Active']);
      const trend = await pool.query('SELECT month, year, SUM(gross_salary) as gross, SUM(net_salary) as net, SUM(total_deductions) as deductions FROM payslips GROUP BY month, year ORDER BY year DESC, month DESC LIMIT 6');
      res.json({ status: 'success', data: { deptSummary: deptSummary.rows, salaryBands: salaryBands.rows, trend: trend.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};

