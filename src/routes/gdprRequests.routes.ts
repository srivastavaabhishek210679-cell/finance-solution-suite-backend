import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const gdpr_requestsService = new BaseService('gdpr_requests', 'request_id');
const gdpr_requestsController = new BaseController(gdpr_requestsService);

// Require authentication
router.use(authenticate);

// CRUD routes for gdpr_requests
router.get('/', gdpr_requestsController.getAll);
router.get('/search', gdpr_requestsController.search);
router.get('/:id', gdpr_requestsController.getById);
router.post('/', gdpr_requestsController.create);
router.put('/:id', gdpr_requestsController.update);
router.delete('/:id', gdpr_requestsController.delete);

export default router;
