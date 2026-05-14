import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const settingsService = new BaseService('settings', 'setting_id');
const settingsController = new BaseController(settingsService);

// Require authentication
router.use(authenticate);

// CRUD routes for settings
router.get('/', settingsController.getAll);
router.get('/search', settingsController.search);
router.get('/:id', settingsController.getById);
router.post('/', settingsController.create);
router.put('/:id', settingsController.update);
router.delete('/:id', settingsController.delete);

export default router;
