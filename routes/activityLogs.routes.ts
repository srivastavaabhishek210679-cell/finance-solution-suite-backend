import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const activity_logsService = new BaseService('activity_logs', 'activity_id');
const activity_logsController = new BaseController(activity_logsService);

// Require authentication
router.use(authenticate);

// CRUD routes for activity_logs
router.get('/', activity_logsController.getAll);
router.get('/search', activity_logsController.search);
router.get('/:id', activity_logsController.getById);
router.post('/', activity_logsController.create);
router.put('/:id', activity_logsController.update);
router.delete('/:id', activity_logsController.delete);

export default router;
