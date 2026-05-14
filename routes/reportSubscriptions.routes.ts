import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_subscriptionsService = new BaseService('report_subscriptions', 'subscription_id');
const report_subscriptionsController = new BaseController(report_subscriptionsService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_subscriptions
router.get('/', report_subscriptionsController.getAll);
router.get('/search', report_subscriptionsController.search);
router.get('/:id', report_subscriptionsController.getById);
router.post('/', report_subscriptionsController.create);
router.put('/:id', report_subscriptionsController.update);
router.delete('/:id', report_subscriptionsController.delete);

export default router;
