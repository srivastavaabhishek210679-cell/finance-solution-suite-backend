import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const exchange_ratesService = new BaseService('exchange_rates', 'rate_id');
const exchange_ratesController = new BaseController(exchange_ratesService);

// Require authentication
router.use(authenticate);

// CRUD routes for exchange_rates
router.get('/', exchange_ratesController.getAll);
router.get('/search', exchange_ratesController.search);
router.get('/:id', exchange_ratesController.getById);
router.post('/', exchange_ratesController.create);
router.put('/:id', exchange_ratesController.update);
router.delete('/:id', exchange_ratesController.delete);

export default router;
