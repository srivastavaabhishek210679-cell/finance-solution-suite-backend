import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const search_historyService = new BaseService('search_history', 'search_id');
const search_historyController = new BaseController(search_historyService);

// Require authentication
router.use(authenticate);

// CRUD routes for search_history
router.get('/', search_historyController.getAll);
router.get('/search', search_historyController.search);
router.get('/:id', search_historyController.getById);
router.post('/', search_historyController.create);
router.put('/:id', search_historyController.update);
router.delete('/:id', search_historyController.delete);

export default router;
