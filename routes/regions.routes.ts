import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const regionsService = new BaseService('regions', 'region_id');
const regionsController = new BaseController(regionsService);

// Require authentication
router.use(authenticate);

// CRUD routes for regions
router.get('/', regionsController.getAll);
router.get('/search', regionsController.search);
router.get('/:id', regionsController.getById);
router.post('/', regionsController.create);
router.put('/:id', regionsController.update);
router.delete('/:id', regionsController.delete);

export default router;
