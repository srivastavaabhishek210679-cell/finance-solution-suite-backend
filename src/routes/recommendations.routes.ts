import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const recommendationsService = new BaseService('recommendations', 'recommendation_id');
const recommendationsController = new BaseController(recommendationsService);

// Require authentication
router.use(authenticate);

// CRUD routes for recommendations
router.get('/', recommendationsController.getAll);
router.get('/search', recommendationsController.search);
router.get('/:id', recommendationsController.getById);
router.post('/', recommendationsController.create);
router.put('/:id', recommendationsController.update);
router.delete('/:id', recommendationsController.delete);

export default router;
