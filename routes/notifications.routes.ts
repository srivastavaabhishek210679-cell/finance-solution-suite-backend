import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const notificationsService = new BaseService('notifications', 'notification_id');
const notificationsController = new BaseController(notificationsService);

// Require authentication
router.use(authenticate);

// CRUD routes for notifications
router.get('/', notificationsController.getAll);
router.get('/search', notificationsController.search);
router.get('/:id', notificationsController.getById);
router.post('/', notificationsController.create);
router.put('/:id', notificationsController.update);
router.delete('/:id', notificationsController.delete);

export default router;
