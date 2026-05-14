import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const chat_responsesService = new BaseService('chat_responses', 'response_id');
const chat_responsesController = new BaseController(chat_responsesService);

// Require authentication
router.use(authenticate);

// CRUD routes for chat_responses
router.get('/', chat_responsesController.getAll);
router.get('/search', chat_responsesController.search);
router.get('/:id', chat_responsesController.getById);
router.post('/', chat_responsesController.create);
router.put('/:id', chat_responsesController.update);
router.delete('/:id', chat_responsesController.delete);

export default router;
