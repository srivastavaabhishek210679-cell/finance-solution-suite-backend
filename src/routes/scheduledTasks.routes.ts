import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const scheduled_tasksService = new BaseService('scheduled_tasks', 'task_id');
const scheduled_tasksController = new BaseController(scheduled_tasksService);

// Require authentication
router.use(authenticate);

// CRUD routes for scheduled_tasks
router.get('/', scheduled_tasksController.getAll);
router.get('/search', scheduled_tasksController.search);
router.get('/:id', scheduled_tasksController.getById);
router.post('/', scheduled_tasksController.create);
router.put('/:id', scheduled_tasksController.update);
router.delete('/:id', scheduled_tasksController.delete);

export default router;
