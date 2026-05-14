import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const feature_flagsService = new BaseService('feature_flags', 'flag_id');
const feature_flagsController = new BaseController(feature_flagsService);

// Require authentication
router.use(authenticate);

// CRUD routes for feature_flags
router.get('/', feature_flagsController.getAll);
router.get('/search', feature_flagsController.search);
router.get('/:id', feature_flagsController.getById);
router.post('/', feature_flagsController.create);
router.put('/:id', feature_flagsController.update);
router.delete('/:id', feature_flagsController.delete);

export default router;
