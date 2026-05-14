import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_dataService = new BaseService('report_data', 'data_id');
const report_dataController = new BaseController(report_dataService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_data
router.get('/', report_dataController.getAll);
router.get('/search', report_dataController.search);
router.get('/:id', report_dataController.getById);
router.post('/', report_dataController.create);
router.put('/:id', report_dataController.update);
router.delete('/:id', report_dataController.delete);

export default router;
