import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const model_training_historyService = new BaseService('model_training_history', 'training_id');
const model_training_historyController = new BaseController(model_training_historyService);

// Require authentication
router.use(authenticate);

// CRUD routes for model_training_history
router.get('/', model_training_historyController.getAll);
router.get('/search', model_training_historyController.search);
router.get('/:id', model_training_historyController.getById);
router.post('/', model_training_historyController.create);
router.put('/:id', model_training_historyController.update);
router.delete('/:id', model_training_historyController.delete);

export default router;
