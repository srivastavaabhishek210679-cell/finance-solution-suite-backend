import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const ai_insightsService = new BaseService('ai_insights', 'insight_id');
const ai_insightsController = new BaseController(ai_insightsService);

// Require authentication
router.use(authenticate);

// CRUD routes for ai_insights
router.get('/', ai_insightsController.getAll);
router.get('/search', ai_insightsController.search);
router.get('/:id', ai_insightsController.getById);
router.post('/', ai_insightsController.create);
router.put('/:id', ai_insightsController.update);
router.delete('/:id', ai_insightsController.delete);

export default router;
