import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const connector_sync_logsService = new BaseService('connector_sync_logs', 'sync_id');
const connector_sync_logsController = new BaseController(connector_sync_logsService);

// Require authentication
router.use(authenticate);

// CRUD routes for connector_sync_logs
router.get('/', connector_sync_logsController.getAll);
router.get('/search', connector_sync_logsController.search);
router.get('/:id', connector_sync_logsController.getById);
router.post('/', connector_sync_logsController.create);
router.put('/:id', connector_sync_logsController.update);
router.delete('/:id', connector_sync_logsController.delete);

export default router;
