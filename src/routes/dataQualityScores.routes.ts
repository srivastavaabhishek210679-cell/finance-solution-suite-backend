import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const data_quality_scoresService = new BaseService('data_quality_scores', 'score_id');
const data_quality_scoresController = new BaseController(data_quality_scoresService);

// Require authentication
router.use(authenticate);

// CRUD routes for data_quality_scores
router.get('/', data_quality_scoresController.getAll);
router.get('/search', data_quality_scoresController.search);
router.get('/:id', data_quality_scoresController.getById);
router.post('/', data_quality_scoresController.create);
router.put('/:id', data_quality_scoresController.update);
router.delete('/:id', data_quality_scoresController.delete);

export default router;
