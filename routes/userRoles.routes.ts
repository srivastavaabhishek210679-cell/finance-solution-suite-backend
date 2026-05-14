import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const user_rolesService = new BaseService('user_roles', 'user_id,role_id');
const user_rolesController = new BaseController(user_rolesService);

// Require authentication
router.use(authenticate);

// CRUD routes for user_roles
router.get('/', user_rolesController.getAll);
router.get('/search', user_rolesController.search);
router.get('/:id', user_rolesController.getById);
router.post('/', user_rolesController.create);
router.put('/:id', user_rolesController.update);
router.delete('/:id', user_rolesController.delete);

export default router;
