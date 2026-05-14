import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const data_lineageService = new BaseService('data_lineage', 'lineage_id');
const data_lineageController = new BaseController(data_lineageService);

// Require authentication
router.use(authenticate);

// CRUD routes for data_lineage
router.get('/', data_lineageController.getAll);
router.get('/search', data_lineageController.search);
router.get('/:id', data_lineageController.getById);
router.post('/', data_lineageController.create);
router.put('/:id', data_lineageController.update);
router.delete('/:id', data_lineageController.delete);

export default router;
