import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const usage_metricsService = new BaseService('usage_metrics', 'usage_id');
const usage_metricsController = new BaseController(usage_metricsService);

// Require authentication
router.use(authenticate);

// CRUD routes for usage_metrics
router.get('/', usage_metricsController.getAll);
router.get('/search', usage_metricsController.search);
router.get('/:id', usage_metricsController.getById);
router.post('/', usage_metricsController.create);
router.put('/:id', usage_metricsController.update);
router.delete('/:id', usage_metricsController.delete);

export default router;
