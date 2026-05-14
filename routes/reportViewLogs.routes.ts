import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_view_logsService = new BaseService('report_view_logs', 'view_id');
const report_view_logsController = new BaseController(report_view_logsService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_view_logs
router.get('/', report_view_logsController.getAll);
router.get('/search', report_view_logsController.search);
router.get('/:id', report_view_logsController.getById);
router.post('/', report_view_logsController.create);
router.put('/:id', report_view_logsController.update);
router.delete('/:id', report_view_logsController.delete);

export default router;
