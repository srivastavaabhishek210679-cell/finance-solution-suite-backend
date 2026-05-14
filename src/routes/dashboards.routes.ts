import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const dashboardsService = new BaseService('dashboards', 'dashboard_id');
const dashboardsController = new BaseController(dashboardsService);

// Require authentication
router.use(authenticate);

// CRUD routes for dashboards
router.get('/', dashboardsController.getAll);
router.get('/search', dashboardsController.search);
router.get('/:id', dashboardsController.getById);
router.post('/', dashboardsController.create);
router.put('/:id', dashboardsController.update);
router.delete('/:id', dashboardsController.delete);

export default router;
