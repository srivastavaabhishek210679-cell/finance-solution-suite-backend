import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const dashboard_widgetsService = new BaseService('dashboard_widgets', 'widget_id');
const dashboard_widgetsController = new BaseController(dashboard_widgetsService);

// Require authentication
router.use(authenticate);

// CRUD routes for dashboard_widgets
router.get('/', dashboard_widgetsController.getAll);
router.get('/search', dashboard_widgetsController.search);
router.get('/:id', dashboard_widgetsController.getById);
router.post('/', dashboard_widgetsController.create);
router.put('/:id', dashboard_widgetsController.update);
router.delete('/:id', dashboard_widgetsController.delete);

export default router;
