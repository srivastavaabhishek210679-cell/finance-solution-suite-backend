import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const plan_featuresService = new BaseService('plan_features', 'feature_id');
const plan_featuresController = new BaseController(plan_featuresService);

// Require authentication
router.use(authenticate);

// CRUD routes for plan_features
router.get('/', plan_featuresController.getAll);
router.get('/search', plan_featuresController.search);
router.get('/:id', plan_featuresController.getById);
router.post('/', plan_featuresController.create);
router.put('/:id', plan_featuresController.update);
router.delete('/:id', plan_featuresController.delete);

export default router;
