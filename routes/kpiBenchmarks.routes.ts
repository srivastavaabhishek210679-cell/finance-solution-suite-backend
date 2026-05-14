import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const kpi_benchmarksService = new BaseService('kpi_benchmarks', 'benchmark_id');
const kpi_benchmarksController = new BaseController(kpi_benchmarksService);

// Require authentication
router.use(authenticate);

// CRUD routes for kpi_benchmarks
router.get('/', kpi_benchmarksController.getAll);
router.get('/search', kpi_benchmarksController.search);
router.get('/:id', kpi_benchmarksController.getById);
router.post('/', kpi_benchmarksController.create);
router.put('/:id', kpi_benchmarksController.update);
router.delete('/:id', kpi_benchmarksController.delete);

export default router;
