import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const localizationService = new BaseService('localization', 'loc_id');
const localizationController = new BaseController(localizationService);

// Require authentication
router.use(authenticate);

// CRUD routes for localization
router.get('/', localizationController.getAll);
router.get('/search', localizationController.search);
router.get('/:id', localizationController.getById);
router.post('/', localizationController.create);
router.put('/:id', localizationController.update);
router.delete('/:id', localizationController.delete);

export default router;
