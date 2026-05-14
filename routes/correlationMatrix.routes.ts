import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const correlation_matrixService = new BaseService('correlation_matrix', 'correlation_id');
const correlation_matrixController = new BaseController(correlation_matrixService);

// Require authentication
router.use(authenticate);

// CRUD routes for correlation_matrix
router.get('/', correlation_matrixController.getAll);
router.get('/search', correlation_matrixController.search);
router.get('/:id', correlation_matrixController.getById);
router.post('/', correlation_matrixController.create);
router.put('/:id', correlation_matrixController.update);
router.delete('/:id', correlation_matrixController.delete);

export default router;
