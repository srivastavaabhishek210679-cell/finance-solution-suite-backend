import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const chat_queriesService = new BaseService('chat_queries', 'query_id');
const chat_queriesController = new BaseController(chat_queriesService);

// Require authentication
router.use(authenticate);

// CRUD routes for chat_queries
router.get('/', chat_queriesController.getAll);
router.get('/search', chat_queriesController.search);
router.get('/:id', chat_queriesController.getById);
router.post('/', chat_queriesController.create);
router.put('/:id', chat_queriesController.update);
router.delete('/:id', chat_queriesController.delete);

export default router;
