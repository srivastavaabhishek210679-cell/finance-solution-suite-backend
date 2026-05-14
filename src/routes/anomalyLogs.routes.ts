import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const anomaly_logsService = new BaseService('anomaly_logs', 'anomaly_id');
const anomaly_logsController = new BaseController(anomaly_logsService);

// Require authentication
router.use(authenticate);

// CRUD routes for anomaly_logs
router.get('/', anomaly_logsController.getAll);
router.get('/search', anomaly_logsController.search);
router.get('/:id', anomaly_logsController.getById);
router.post('/', anomaly_logsController.create);
router.put('/:id', anomaly_logsController.update);
router.delete('/:id', anomaly_logsController.delete);

export default router;
