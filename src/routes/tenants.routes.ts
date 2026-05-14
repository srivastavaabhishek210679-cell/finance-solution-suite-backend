import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
const router = Router();
const tenantsService = new BaseService('tenants', 'tenant_id');
const tenantsController = new BaseController(tenantsService);

// CRUD routes for tenants
router.get('/', tenantsController.getAll);
router.get('/search', tenantsController.search);
router.get('/:id', tenantsController.getById);
router.post('/', tenantsController.create);
router.put('/:id', tenantsController.update);
router.delete('/:id', tenantsController.delete);

export default router;
