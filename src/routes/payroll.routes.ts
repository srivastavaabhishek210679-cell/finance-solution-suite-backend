import { Router } from 'express';
import { payrollController } from '../controllers/payroll.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/employees', payrollController.getEmployees);
router.get('/employees/:id', payrollController.getEmployee);
router.post('/employees', payrollController.createEmployee);
router.put('/employees/:id', payrollController.updateEmployee);
router.delete('/employees/:id', payrollController.deleteEmployee);
router.post('/run', payrollController.runPayroll);
router.get('/runs', payrollController.getPayrollRuns);
router.get('/runs/:payrollId/payslips', payrollController.getPayslips);
router.get('/stats', payrollController.getStats);

export default router;