import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const integration_logsService = new BaseService('integration_logs', 'log_id');
const integration_logsController = new BaseController(integration_logsService);

// Require authentication
router.use(authenticate);

// CRUD routes for integration_logs
router.get('/', integration_logsController.getAll);
router.get('/search', integration_logsController.search);
router.get('/:id', integration_logsController.getById);
router.post('/', integration_logsController.create);
router.put('/:id', integration_logsController.update);
router.delete('/:id', integration_logsController.delete);

export default router;
