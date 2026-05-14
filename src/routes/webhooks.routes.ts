import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const webhooksService = new BaseService('webhooks', 'webhook_id');
const webhooksController = new BaseController(webhooksService);

// Require authentication
router.use(authenticate);

// CRUD routes for webhooks
router.get('/', webhooksController.getAll);
router.get('/search', webhooksController.search);
router.get('/:id', webhooksController.getById);
router.post('/', webhooksController.create);
router.put('/:id', webhooksController.update);
router.delete('/:id', webhooksController.delete);

export default router;
