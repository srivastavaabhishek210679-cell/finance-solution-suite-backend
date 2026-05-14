import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const domainsService = new BaseService('domains', 'domain_id');
const domainsController = new BaseController(domainsService);

// Require authentication
router.use(authenticate);

// CRUD routes for domains
router.get('/', domainsController.getAll);
router.get('/search', domainsController.search);
router.get('/:id', domainsController.getById);
router.post('/', domainsController.create);
router.put('/:id', domainsController.update);
router.delete('/:id', domainsController.delete);

export default router;
