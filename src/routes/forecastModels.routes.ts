import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const forecast_modelsService = new BaseService('forecast_models', 'model_id');
const forecast_modelsController = new BaseController(forecast_modelsService);

// Require authentication
router.use(authenticate);

// CRUD routes for forecast_models
router.get('/', forecast_modelsController.getAll);
router.get('/search', forecast_modelsController.search);
router.get('/:id', forecast_modelsController.getById);
router.post('/', forecast_modelsController.create);
router.put('/:id', forecast_modelsController.update);
router.delete('/:id', forecast_modelsController.delete);

export default router;
