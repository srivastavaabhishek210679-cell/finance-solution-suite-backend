import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const activityLogsService = new BaseService('activity_logs', 'log_id');
const activityLogsController = new BaseController(activityLogsService);

// All routes require authentication
router.use(authenticate);

// Activity logs routes (admin monitoring)
router.get('/activity-logs', activityLogsController.getAll);
router.get('/activity-logs/search', activityLogsController.search);
router.get('/activity-logs/:id', activityLogsController.getById);

export default router;
