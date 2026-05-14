import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_kpisService = new BaseService('report_kpis', 'kpi_id');
const report_kpisController = new BaseController(report_kpisService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_kpis
router.get('/', report_kpisController.getAll);
router.get('/search', report_kpisController.search);
router.get('/:id', report_kpisController.getById);
router.post('/', report_kpisController.create);
router.put('/:id', report_kpisController.update);
router.delete('/:id', report_kpisController.delete);

export default router;
