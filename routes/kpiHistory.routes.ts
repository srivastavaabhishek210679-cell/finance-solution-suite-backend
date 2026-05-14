import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const kpi_historyService = new BaseService('kpi_history', 'history_id');
const kpi_historyController = new BaseController(kpi_historyService);

// Require authentication
router.use(authenticate);

// CRUD routes for kpi_history
router.get('/', kpi_historyController.getAll);
router.get('/search', kpi_historyController.search);
router.get('/:id', kpi_historyController.getById);
router.post('/', kpi_historyController.create);
router.put('/:id', kpi_historyController.update);
router.delete('/:id', kpi_historyController.delete);

export default router;
