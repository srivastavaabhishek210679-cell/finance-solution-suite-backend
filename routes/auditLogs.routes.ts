import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const audit_logsService = new BaseService('audit_logs', 'log_id');
const audit_logsController = new BaseController(audit_logsService);

// Require authentication
router.use(authenticate);

// CRUD routes for audit_logs
router.get('/', audit_logsController.getAll);
router.get('/search', audit_logsController.search);
router.get('/:id', audit_logsController.getById);
router.post('/', audit_logsController.create);
router.put('/:id', audit_logsController.update);
router.delete('/:id', audit_logsController.delete);

export default router;
