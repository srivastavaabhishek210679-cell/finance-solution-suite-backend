import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_approvalsService = new BaseService('report_approvals', 'approval_id');
const report_approvalsController = new BaseController(report_approvalsService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_approvals
router.get('/', report_approvalsController.getAll);
router.get('/search', report_approvalsController.search);
router.get('/:id', report_approvalsController.getById);
router.post('/', report_approvalsController.create);
router.put('/:id', report_approvalsController.update);
router.delete('/:id', report_approvalsController.delete);

export default router;
