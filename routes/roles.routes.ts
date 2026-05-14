import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const rolesService = new BaseService('roles', 'role_id');
const rolesController = new BaseController(rolesService);

// Require authentication
router.use(authenticate);

// CRUD routes for roles
router.get('/', rolesController.getAll);
router.get('/search', rolesController.search);
router.get('/:id', rolesController.getById);
router.post('/', rolesController.create);
router.put('/:id', rolesController.update);
router.delete('/:id', rolesController.delete);

export default router;
