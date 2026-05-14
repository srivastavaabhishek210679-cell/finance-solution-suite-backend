import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const api_keysService = new BaseService('api_keys', 'api_key_id');
const api_keysController = new BaseController(api_keysService);

// Require authentication
router.use(authenticate);

// CRUD routes for api_keys
router.get('/', api_keysController.getAll);
router.get('/search', api_keysController.search);
router.get('/:id', api_keysController.getById);
router.post('/', api_keysController.create);
router.put('/:id', api_keysController.update);
router.delete('/:id', api_keysController.delete);

export default router;
