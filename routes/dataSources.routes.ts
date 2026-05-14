import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const data_sourcesService = new BaseService('data_sources', 'source_id');
const data_sourcesController = new BaseController(data_sourcesService);

// Require authentication
router.use(authenticate);

// CRUD routes for data_sources
router.get('/', data_sourcesController.getAll);
router.get('/search', data_sourcesController.search);
router.get('/:id', data_sourcesController.getById);
router.post('/', data_sourcesController.create);
router.put('/:id', data_sourcesController.update);
router.delete('/:id', data_sourcesController.delete);

export default router;
