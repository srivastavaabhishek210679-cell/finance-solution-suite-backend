import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const oauth_providersService = new BaseService('oauth_providers', 'provider_id');
const oauth_providersController = new BaseController(oauth_providersService);

// Require authentication
router.use(authenticate);

// CRUD routes for oauth_providers
router.get('/', oauth_providersController.getAll);
router.get('/search', oauth_providersController.search);
router.get('/:id', oauth_providersController.getById);
router.post('/', oauth_providersController.create);
router.put('/:id', oauth_providersController.update);
router.delete('/:id', oauth_providersController.delete);

export default router;
