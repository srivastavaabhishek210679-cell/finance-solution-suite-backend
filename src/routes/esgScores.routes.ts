import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const esg_scoresService = new BaseService('esg_scores', 'esg_id');
const esg_scoresController = new BaseController(esg_scoresService);

// Require authentication
router.use(authenticate);

// CRUD routes for esg_scores
router.get('/', esg_scoresController.getAll);
router.get('/search', esg_scoresController.search);
router.get('/:id', esg_scoresController.getById);
router.post('/', esg_scoresController.create);
router.put('/:id', esg_scoresController.update);
router.delete('/:id', esg_scoresController.delete);

export default router;
