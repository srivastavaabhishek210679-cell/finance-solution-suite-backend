import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const task_historyService = new BaseService('task_history', 'history_id');
const task_historyController = new BaseController(task_historyService);

// Require authentication
router.use(authenticate);

// CRUD routes for task_history
router.get('/', task_historyController.getAll);
router.get('/search', task_historyController.search);
router.get('/:id', task_historyController.getById);
router.post('/', task_historyController.create);
router.put('/:id', task_historyController.update);
router.delete('/:id', task_historyController.delete);

export default router;
