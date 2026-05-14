import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const email_queueService = new BaseService('email_queue', 'queue_id');
const email_queueController = new BaseController(email_queueService);

// Require authentication
router.use(authenticate);

// CRUD routes for email_queue
router.get('/', email_queueController.getAll);
router.get('/search', email_queueController.search);
router.get('/:id', email_queueController.getById);
router.post('/', email_queueController.create);
router.put('/:id', email_queueController.update);
router.delete('/:id', email_queueController.delete);

export default router;
