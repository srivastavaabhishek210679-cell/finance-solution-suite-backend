import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const source_mappingsService = new BaseService('source_mappings', 'mapping_id');
const source_mappingsController = new BaseController(source_mappingsService);

// Require authentication
router.use(authenticate);

// CRUD routes for source_mappings
router.get('/', source_mappingsController.getAll);
router.get('/search', source_mappingsController.search);
router.get('/:id', source_mappingsController.getById);
router.post('/', source_mappingsController.create);
router.put('/:id', source_mappingsController.update);
router.delete('/:id', source_mappingsController.delete);

export default router;
