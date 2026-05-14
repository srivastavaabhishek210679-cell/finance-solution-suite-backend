import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const scheduledTasksService = new BaseService('scheduled_tasks', 'task_id');
const scheduledTasksController = new BaseController(scheduledTasksService);

// All routes require authentication
router.use(authenticate);

// Scheduled tasks routes (automation)
router.get('/scheduled-tasks', scheduledTasksController.getAll);
router.get('/scheduled-tasks/search', scheduledTasksController.search);
router.get('/scheduled-tasks/:id', scheduledTasksController.getById);
router.post('/scheduled-tasks', scheduledTasksController.create);
router.put('/scheduled-tasks/:id', scheduledTasksController.update);
router.delete('/scheduled-tasks/:id', scheduledTasksController.delete);

export default router;
