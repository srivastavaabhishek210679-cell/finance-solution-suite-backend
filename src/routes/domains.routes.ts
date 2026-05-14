import { Router } from 'express';
import { NonTenantBaseController } from '../controllers/nonTenant.base.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new NonTenantBaseController('domains');

// All routes require authentication
router.use(authenticate);

// GET /api/v1/domains - Get all domains
router.get('/', controller.getAll);

// GET /api/v1/domains/search - Search domains
router.get('/search', controller.search);

// GET /api/v1/domains/:id - Get domain by ID
router.get('/:id', controller.getById);

// POST /api/v1/domains - Create new domain
router.post('/', controller.create);

// PUT /api/v1/domains/:id - Update domain
router.put('/:id', controller.update);

// DELETE /api/v1/domains/:id - Delete domain
router.delete('/:id', controller.delete);

export default router;
