import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const subscription_plansService = new BaseService('subscription_plans', 'plan_id');
const subscription_plansController = new BaseController(subscription_plansService);

// Require authentication
router.use(authenticate);

// CRUD routes for subscription_plans
router.get('/', subscription_plansController.getAll);
router.get('/search', subscription_plansController.search);
router.get('/:id', subscription_plansController.getById);
router.post('/', subscription_plansController.create);
router.put('/:id', subscription_plansController.update);
router.delete('/:id', subscription_plansController.delete);

export default router;
