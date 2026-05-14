import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const role_permissionsService = new BaseService('role_permissions', 'role_id,perm_id');
const role_permissionsController = new BaseController(role_permissionsService);

// Require authentication
router.use(authenticate);

// CRUD routes for role_permissions
router.get('/', role_permissionsController.getAll);
router.get('/search', role_permissionsController.search);
router.get('/:id', role_permissionsController.getById);
router.post('/', role_permissionsController.create);
router.put('/:id', role_permissionsController.update);
router.delete('/:id', role_permissionsController.delete);

export default router;
