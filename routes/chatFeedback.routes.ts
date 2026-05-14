import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const chat_feedbackService = new BaseService('chat_feedback', 'feedback_id');
const chat_feedbackController = new BaseController(chat_feedbackService);

// Require authentication
router.use(authenticate);

// CRUD routes for chat_feedback
router.get('/', chat_feedbackController.getAll);
router.get('/search', chat_feedbackController.search);
router.get('/:id', chat_feedbackController.getById);
router.post('/', chat_feedbackController.create);
router.put('/:id', chat_feedbackController.update);
router.delete('/:id', chat_feedbackController.delete);

export default router;
