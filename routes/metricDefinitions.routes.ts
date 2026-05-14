import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const metric_definitionsService = new BaseService('metric_definitions', 'metric_id');
const metric_definitionsController = new BaseController(metric_definitionsService);

// Require authentication
router.use(authenticate);

// CRUD routes for metric_definitions
router.get('/', metric_definitionsController.getAll);
router.get('/search', metric_definitionsController.search);
router.get('/:id', metric_definitionsController.getById);
router.post('/', metric_definitionsController.create);
router.put('/:id', metric_definitionsController.update);
router.delete('/:id', metric_definitionsController.delete);

export default router;
