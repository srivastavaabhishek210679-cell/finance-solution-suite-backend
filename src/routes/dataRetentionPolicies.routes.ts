import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const data_retention_policiesService = new BaseService('data_retention_policies', 'policy_id');
const data_retention_policiesController = new BaseController(data_retention_policiesService);

// Require authentication
router.use(authenticate);

// CRUD routes for data_retention_policies
router.get('/', data_retention_policiesController.getAll);
router.get('/search', data_retention_policiesController.search);
router.get('/:id', data_retention_policiesController.getById);
router.post('/', data_retention_policiesController.create);
router.put('/:id', data_retention_policiesController.update);
router.delete('/:id', data_retention_policiesController.delete);

export default router;
