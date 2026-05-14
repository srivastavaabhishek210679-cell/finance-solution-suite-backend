import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const benchmarking_dataService = new BaseService('benchmarking_data', 'benchmark_id');
const benchmarking_dataController = new BaseController(benchmarking_dataService);

// Require authentication
router.use(authenticate);

// CRUD routes for benchmarking_data
router.get('/', benchmarking_dataController.getAll);
router.get('/search', benchmarking_dataController.search);
router.get('/:id', benchmarking_dataController.getById);
router.post('/', benchmarking_dataController.create);
router.put('/:id', benchmarking_dataController.update);
router.delete('/:id', benchmarking_dataController.delete);

export default router;
