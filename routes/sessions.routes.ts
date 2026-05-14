import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const sessionsService = new BaseService('sessions', 'session_id');
const sessionsController = new BaseController(sessionsService);

// Require authentication
router.use(authenticate);

// CRUD routes for sessions
router.get('/', sessionsController.getAll);
router.get('/search', sessionsController.search);
router.get('/:id', sessionsController.getById);
router.post('/', sessionsController.create);
router.put('/:id', sessionsController.update);
router.delete('/:id', sessionsController.delete);

export default router;
