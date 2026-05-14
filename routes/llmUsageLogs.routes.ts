import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const llm_usage_logsService = new BaseService('llm_usage_logs', 'usage_id');
const llm_usage_logsController = new BaseController(llm_usage_logsService);

// Require authentication
router.use(authenticate);

// CRUD routes for llm_usage_logs
router.get('/', llm_usage_logsController.getAll);
router.get('/search', llm_usage_logsController.search);
router.get('/:id', llm_usage_logsController.getById);
router.post('/', llm_usage_logsController.create);
router.put('/:id', llm_usage_logsController.update);
router.delete('/:id', llm_usage_logsController.delete);

export default router;
