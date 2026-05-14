import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const system_metricsService = new BaseService('system_metrics', 'metric_id');
const system_metricsController = new BaseController(system_metricsService);

// Require authentication
router.use(authenticate);

// CRUD routes for system_metrics
router.get('/', system_metricsController.getAll);
router.get('/search', system_metricsController.search);
router.get('/:id', system_metricsController.getById);
router.post('/', system_metricsController.create);
router.put('/:id', system_metricsController.update);
router.delete('/:id', system_metricsController.delete);

export default router;
