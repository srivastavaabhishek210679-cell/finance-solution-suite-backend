import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const saved_filtersService = new BaseService('saved_filters', 'filter_id');
const saved_filtersController = new BaseController(saved_filtersService);

// Require authentication
router.use(authenticate);

// CRUD routes for saved_filters
router.get('/', saved_filtersController.getAll);
router.get('/search', saved_filtersController.search);
router.get('/:id', saved_filtersController.getById);
router.post('/', saved_filtersController.create);
router.put('/:id', saved_filtersController.update);
router.delete('/:id', saved_filtersController.delete);

export default router;
