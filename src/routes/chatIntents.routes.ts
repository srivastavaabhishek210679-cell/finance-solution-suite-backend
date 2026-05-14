import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const chat_intentsService = new BaseService('chat_intents', 'intent_id');
const chat_intentsController = new BaseController(chat_intentsService);

// Require authentication
router.use(authenticate);

// CRUD routes for chat_intents
router.get('/', chat_intentsController.getAll);
router.get('/search', chat_intentsController.search);
router.get('/:id', chat_intentsController.getById);
router.post('/', chat_intentsController.create);
router.put('/:id', chat_intentsController.update);
router.delete('/:id', chat_intentsController.delete);

export default router;
