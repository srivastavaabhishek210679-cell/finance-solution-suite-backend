import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const alert_rulesService = new BaseService('alert_rules', 'alert_id');
const alert_rulesController = new BaseController(alert_rulesService);

// Require authentication
router.use(authenticate);

// CRUD routes for alert_rules
router.get('/', alert_rulesController.getAll);
router.get('/search', alert_rulesController.search);
router.get('/:id', alert_rulesController.getById);
router.post('/', alert_rulesController.create);
router.put('/:id', alert_rulesController.update);
router.delete('/:id', alert_rulesController.delete);

export default router;
