import { Router } from 'express';
import { NonTenantBaseController } from '../controllers/nonTenant.base.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new NonTenantBaseController('permissions');

// All routes require authentication
router.use(authenticate);

// GET /api/v1/permissions - Get all permissions
router.get('/', controller.getAll);

// GET /api/v1/permissions/search - Search permissions
router.get('/search', controller.search);

// GET /api/v1/permissions/:id - Get permission by ID
router.get('/:id', controller.getById);

// POST /api/v1/permissions - Create new permission
router.post('/', controller.create);

// PUT /api/v1/permissions/:id - Update permission
router.put('/:id', controller.update);

// DELETE /api/v1/permissions/:id - Delete permission
router.delete('/:id', controller.delete);

export default router;
