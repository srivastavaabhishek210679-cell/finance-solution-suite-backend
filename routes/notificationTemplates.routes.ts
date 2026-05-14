import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const notification_templatesService = new BaseService('notification_templates', 'template_id');
const notification_templatesController = new BaseController(notification_templatesService);

// Require authentication
router.use(authenticate);

// CRUD routes for notification_templates
router.get('/', notification_templatesController.getAll);
router.get('/search', notification_templatesController.search);
router.get('/:id', notification_templatesController.getById);
router.post('/', notification_templatesController.create);
router.put('/:id', notification_templatesController.update);
router.delete('/:id', notification_templatesController.delete);

export default router;
