import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_filtersService = new BaseService('report_filters', 'filter_id');
const report_filtersController = new BaseController(report_filtersService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_filters
router.get('/', report_filtersController.getAll);
router.get('/search', report_filtersController.search);
router.get('/:id', report_filtersController.getById);
router.post('/', report_filtersController.create);
router.put('/:id', report_filtersController.update);
router.delete('/:id', report_filtersController.delete);

export default router;
