import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_run_historyService = new BaseService('report_run_history', 'run_id');
const report_run_historyController = new BaseController(report_run_historyService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_run_history
router.get('/', report_run_historyController.getAll);
router.get('/search', report_run_historyController.search);
router.get('/:id', report_run_historyController.getById);
router.post('/', report_run_historyController.create);
router.put('/:id', report_run_historyController.update);
router.delete('/:id', report_run_historyController.delete);

export default router;
