import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();

// Roles service and controller
const roleService = new BaseService('roles', 'role_id');
const roleController = new BaseController(roleService);

// Role permissions service and controller
const rolePermService = new BaseService('role_permissions', 'role_id,perm_id');
const rolePermController = new BaseController(rolePermService);

// All routes require authentication
router.use(authenticate);

// Role routes
router.get('/', roleController.getAll);
router.get('/search', roleController.search);
router.get('/:id', roleController.getById);
router.post('/', roleController.create);
router.put('/:id', roleController.update);
router.delete('/:id', roleController.delete);

// Role permissions sub-routes
router.get('/:id/permissions', async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id);
    const result = await roleService.findById(roleId);
    res.json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
