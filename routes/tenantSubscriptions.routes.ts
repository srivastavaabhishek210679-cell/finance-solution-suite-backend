import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const tenant_subscriptionsService = new BaseService('tenant_subscriptions', 'subscription_id');
const tenant_subscriptionsController = new BaseController(tenant_subscriptionsService);

// Require authentication
router.use(authenticate);

// CRUD routes for tenant_subscriptions
router.get('/', tenant_subscriptionsController.getAll);
router.get('/search', tenant_subscriptionsController.search);
router.get('/:id', tenant_subscriptionsController.getById);
router.post('/', tenant_subscriptionsController.create);
router.put('/:id', tenant_subscriptionsController.update);
router.delete('/:id', tenant_subscriptionsController.delete);

export default router;
