import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const deployment_logsService = new BaseService('deployment_logs', 'deployment_id');
const deployment_logsController = new BaseController(deployment_logsService);

// Require authentication
router.use(authenticate);

// CRUD routes for deployment_logs
router.get('/', deployment_logsController.getAll);
router.get('/search', deployment_logsController.search);
router.get('/:id', deployment_logsController.getById);
router.post('/', deployment_logsController.create);
router.put('/:id', deployment_logsController.update);
router.delete('/:id', deployment_logsController.delete);

export default router;
