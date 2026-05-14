import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const countriesService = new BaseService('countries', 'country_code');
const countriesController = new BaseController(countriesService);

// Require authentication
router.use(authenticate);

// CRUD routes for countries
router.get('/', countriesController.getAll);
router.get('/search', countriesController.search);
router.get('/:id', countriesController.getById);
router.post('/', countriesController.create);
router.put('/:id', countriesController.update);
router.delete('/:id', countriesController.delete);

export default router;
