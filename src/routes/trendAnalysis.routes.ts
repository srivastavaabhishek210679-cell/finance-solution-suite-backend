import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const trend_analysisService = new BaseService('trend_analysis', 'trend_id');
const trend_analysisController = new BaseController(trend_analysisService);

// Require authentication
router.use(authenticate);

// CRUD routes for trend_analysis
router.get('/', trend_analysisController.getAll);
router.get('/search', trend_analysisController.search);
router.get('/:id', trend_analysisController.getById);
router.post('/', trend_analysisController.create);
router.put('/:id', trend_analysisController.update);
router.delete('/:id', trend_analysisController.delete);

export default router;
