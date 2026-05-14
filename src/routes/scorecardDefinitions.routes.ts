import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const scorecard_definitionsService = new BaseService('scorecard_definitions', 'scorecard_id');
const scorecard_definitionsController = new BaseController(scorecard_definitionsService);

// Require authentication
router.use(authenticate);

// CRUD routes for scorecard_definitions
router.get('/', scorecard_definitionsController.getAll);
router.get('/search', scorecard_definitionsController.search);
router.get('/:id', scorecard_definitionsController.getById);
router.post('/', scorecard_definitionsController.create);
router.put('/:id', scorecard_definitionsController.update);
router.delete('/:id', scorecard_definitionsController.delete);

export default router;
