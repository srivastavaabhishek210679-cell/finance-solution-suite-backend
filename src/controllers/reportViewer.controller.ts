import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

const generateReportData = (report: any) => {
  const domain = report.domain_id
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const currentMonth = new Date().getMonth()
  const last6Months = months.slice(Math.max(0, currentMonth-5), currentMonth+1)

  const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

  const trendData = last6Months.map((month, i) => ({
    month,
    value: randomBetween(60, 100),
    target: 85,
    previous: randomBetween(55, 95)
  }))

  const domainMetrics: Record<number, any> = {
    1: { metrics: [{ label: 'Total Revenue', value: '.2M', change: '+8.2%', color: '#10b981' }, { label: 'Operating Expenses', value: '.4M', change: '+3.1%', color: '#f59e0b' }, { label: 'Net Profit', value: '.8M', change: '+14.2%', color: '#3b82f6' }, { label: 'Profit Margin', value: '31.9%', change: '+2.1%', color: '#8b5cf6' }], chartLabel: 'Revenue (M$)' },
    2: { metrics: [{ label: 'Total Headcount', value: '1,248', change: '+3.2%', color: '#10b981' }, { label: 'Attrition Rate', value: '8.4%', change: '-1.2%', color: '#f59e0b' }, { label: 'Open Positions', value: '34', change: '+5', color: '#3b82f6' }, { label: 'Avg Tenure', value: '3.8 yrs', change: '+0.3', color: '#8b5cf6' }], chartLabel: 'Headcount' },
    3: { metrics: [{ label: 'Output Units', value: '48,200', change: '+6.4%', color: '#10b981' }, { label: 'Efficiency Rate', value: '91.2%', change: '+2.3%', color: '#f59e0b' }, { label: 'Downtime Hours', value: '24h', change: '-18%', color: '#3b82f6' }, { label: 'SLA Compliance', value: '97.8%', change: '+0.8%', color: '#8b5cf6' }], chartLabel: 'Efficiency %' },
    4: { metrics: [{ label: 'Total Revenue', value: '.4M', change: '+12.1%', color: '#10b981' }, { label: 'New Deals', value: '142', change: '+8.4%', color: '#f59e0b' }, { label: 'Win Rate', value: '34.2%', change: '+2.1%', color: '#3b82f6' }, { label: 'Avg Deal Size', value: '.2K', change: '+3.4%', color: '#8b5cf6' }], chartLabel: 'Revenue ()' },
    5: { metrics: [{ label: 'System Uptime', value: '99.8%', change: '+0.1%', color: '#10b981' }, { label: 'Incidents', value: '12', change: '-25%', color: '#f59e0b' }, { label: 'Avg Response', value: '142ms', change: '-8%', color: '#3b82f6' }, { label: 'Security Score', value: '94/100', change: '+2', color: '#8b5cf6' }], chartLabel: 'Uptime %' },
  }

  const defaultMetrics = { metrics: [
    { label: 'Compliance Rate', value: '87.4%', change: '+2.1%', color: '#10b981' },
    { label: 'Risk Score', value: '23.3', change: '-5.3%', color: '#f59e0b' },
    { label: 'Reports Filed', value: '142', change: '+8%', color: '#3b82f6' },
    { label: 'Automation Rate', value: '68.2%', change: '+12%', color: '#8b5cf6' }
  ], chartLabel: 'Performance %' }

  const domainData = domainMetrics[domain] || defaultMetrics

  return {
    report,
    metrics: domainData.metrics,
    trendData,
    chartLabel: domainData.chartLabel,
    tableData: Array.from({length: 8}, (_, i) => ({
      month: last6Months[i % last6Months.length],
      actual: randomBetween(70, 100),
      target: 85,
      variance: randomBetween(-10, 15),
      status: Math.random() > 0.3 ? 'On Track' : 'At Risk'
    }))
  }
}

export const reportViewerController = {
  getReportData: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM reports_master WHERE report_id = $1',
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Report not found' });
    const data = generateReportData(result.rows[0]);
    res.json({ status: 'success', data });
  }
};
