import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const security_eventsService = new BaseService('security_events', 'event_id');
const security_eventsController = new BaseController(security_eventsService);

// Require authentication
router.use(authenticate);

// CRUD routes for security_events
router.get('/', security_eventsController.getAll);
router.get('/search', security_eventsController.search);
router.get('/:id', security_eventsController.getById);
router.post('/', security_eventsController.create);
router.put('/:id', security_eventsController.update);
router.delete('/:id', security_eventsController.delete);

export default router;
