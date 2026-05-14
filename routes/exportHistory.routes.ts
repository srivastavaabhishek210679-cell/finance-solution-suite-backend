import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const export_historyService = new BaseService('export_history', 'export_id');
const export_historyController = new BaseController(export_historyService);

// Require authentication
router.use(authenticate);

// CRUD routes for export_history
router.get('/', export_historyController.getAll);
router.get('/search', export_historyController.search);
router.get('/:id', export_historyController.getById);
router.post('/', export_historyController.create);
router.put('/:id', export_historyController.update);
router.delete('/:id', export_historyController.delete);

export default router;
