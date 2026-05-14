import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_access_policiesService = new BaseService('report_access_policies', 'policy_id');
const report_access_policiesController = new BaseController(report_access_policiesService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_access_policies
router.get('/', report_access_policiesController.getAll);
router.get('/search', report_access_policiesController.search);
router.get('/:id', report_access_policiesController.getById);
router.post('/', report_access_policiesController.create);
router.put('/:id', report_access_policiesController.update);
router.delete('/:id', report_access_policiesController.delete);

export default router;
