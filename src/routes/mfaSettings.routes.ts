import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const mfa_settingsService = new BaseService('mfa_settings', 'mfa_id');
const mfa_settingsController = new BaseController(mfa_settingsService);

// Require authentication
router.use(authenticate);

// CRUD routes for mfa_settings
router.get('/', mfa_settingsController.getAll);
router.get('/search', mfa_settingsController.search);
router.get('/:id', mfa_settingsController.getById);
router.post('/', mfa_settingsController.create);
router.put('/:id', mfa_settingsController.update);
router.delete('/:id', mfa_settingsController.delete);

export default router;
