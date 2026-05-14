import { Router } from 'express';
import { NonTenantBaseController } from '../controllers/nonTenant.base.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new NonTenantBaseController('exchange_rates');

// All routes require authentication
router.use(authenticate);

// CRUD routes for exchange_rates
router.get('/', controller.getAll);
router.get('/search', controller.search);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
