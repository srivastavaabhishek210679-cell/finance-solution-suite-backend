import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const error_logsService = new BaseService('error_logs', 'error_id');
const error_logsController = new BaseController(error_logsService);

// Require authentication
router.use(authenticate);

// CRUD routes for error_logs
router.get('/', error_logsController.getAll);
router.get('/search', error_logsController.search);
router.get('/:id', error_logsController.getById);
router.post('/', error_logsController.create);
router.put('/:id', error_logsController.update);
router.delete('/:id', error_logsController.delete);

export default router;
