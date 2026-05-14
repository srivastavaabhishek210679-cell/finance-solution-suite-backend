import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const permissionsService = new BaseService('permissions', 'perm_id');
const permissionsController = new BaseController(permissionsService);

// Require authentication
router.use(authenticate);

// CRUD routes for permissions
router.get('/', permissionsController.getAll);
router.get('/search', permissionsController.search);
router.get('/:id', permissionsController.getById);
router.post('/', permissionsController.create);
router.put('/:id', permissionsController.update);
router.delete('/:id', permissionsController.delete);

export default router;
