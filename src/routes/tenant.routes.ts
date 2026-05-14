import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const tenantService = new BaseService('tenants', 'tenant_id');
const tenantController = new BaseController(tenantService);

// Public route - no auth required for tenant creation
router.post('/', tenantController.create);

// Protected routes
router.use(authenticate);
router.get('/', tenantController.getAll);
router.get('/search', tenantController.search);
router.get('/:id', tenantController.getById);
router.put('/:id', tenantController.update);
router.delete('/:id', tenantController.delete);

export default router;
