import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const executive_narrativesService = new BaseService('executive_narratives', 'narrative_id');
const executive_narrativesController = new BaseController(executive_narrativesService);

// Require authentication
router.use(authenticate);

// CRUD routes for executive_narratives
router.get('/', executive_narrativesController.getAll);
router.get('/search', executive_narrativesController.search);
router.get('/:id', executive_narrativesController.getById);
router.post('/', executive_narrativesController.create);
router.put('/:id', executive_narrativesController.update);
router.delete('/:id', executive_narrativesController.delete);

export default router;
