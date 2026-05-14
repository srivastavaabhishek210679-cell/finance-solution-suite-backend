import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const currenciesService = new BaseService('currencies', 'currency_code');
const currenciesController = new BaseController(currenciesService);

// Require authentication
router.use(authenticate);

// CRUD routes for currencies
router.get('/', currenciesController.getAll);
router.get('/search', currenciesController.search);
router.get('/:id', currenciesController.getById);
router.post('/', currenciesController.create);
router.put('/:id', currenciesController.update);
router.delete('/:id', currenciesController.delete);

export default router;
