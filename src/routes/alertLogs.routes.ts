import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const alert_logsService = new BaseService('alert_logs', 'log_id');
const alert_logsController = new BaseController(alert_logsService);

// Require authentication
router.use(authenticate);

// CRUD routes for alert_logs
router.get('/', alert_logsController.getAll);
router.get('/search', alert_logsController.search);
router.get('/:id', alert_logsController.getById);
router.post('/', alert_logsController.create);
router.put('/:id', alert_logsController.update);
router.delete('/:id', alert_logsController.delete);

export default router;
