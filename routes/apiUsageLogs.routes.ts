import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const api_usage_logsService = new BaseService('api_usage_logs', 'log_id');
const api_usage_logsController = new BaseController(api_usage_logsService);

// Require authentication
router.use(authenticate);

// CRUD routes for api_usage_logs
router.get('/', api_usage_logsController.getAll);
router.get('/search', api_usage_logsController.search);
router.get('/:id', api_usage_logsController.getById);
router.post('/', api_usage_logsController.create);
router.put('/:id', api_usage_logsController.update);
router.delete('/:id', api_usage_logsController.delete);

export default router;
