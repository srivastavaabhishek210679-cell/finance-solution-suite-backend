import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const translationsService = new BaseService('translations', 'translation_id');
const translationsController = new BaseController(translationsService);

// Require authentication
router.use(authenticate);

// CRUD routes for translations
router.get('/', translationsController.getAll);
router.get('/search', translationsController.search);
router.get('/:id', translationsController.getById);
router.post('/', translationsController.create);
router.put('/:id', translationsController.update);
router.delete('/:id', translationsController.delete);

export default router;
