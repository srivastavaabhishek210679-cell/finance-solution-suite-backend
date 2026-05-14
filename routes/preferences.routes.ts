import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const preferencesService = new BaseService('preferences', 'pref_id');
const preferencesController = new BaseController(preferencesService);

// Require authentication
router.use(authenticate);

// CRUD routes for preferences
router.get('/', preferencesController.getAll);
router.get('/search', preferencesController.search);
router.get('/:id', preferencesController.getById);
router.post('/', preferencesController.create);
router.put('/:id', preferencesController.update);
router.delete('/:id', preferencesController.delete);

export default router;
