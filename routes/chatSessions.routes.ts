import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const chat_sessionsService = new BaseService('chat_sessions', 'session_id');
const chat_sessionsController = new BaseController(chat_sessionsService);

// Require authentication
router.use(authenticate);

// CRUD routes for chat_sessions
router.get('/', chat_sessionsController.getAll);
router.get('/search', chat_sessionsController.search);
router.get('/:id', chat_sessionsController.getById);
router.post('/', chat_sessionsController.create);
router.put('/:id', chat_sessionsController.update);
router.delete('/:id', chat_sessionsController.delete);

export default router;
