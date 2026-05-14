import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const ip_allowlistService = new BaseService('ip_allowlist', 'allowlist_id');
const ip_allowlistController = new BaseController(ip_allowlistService);

// Require authentication
router.use(authenticate);

// CRUD routes for ip_allowlist
router.get('/', ip_allowlistController.getAll);
router.get('/search', ip_allowlistController.search);
router.get('/:id', ip_allowlistController.getById);
router.post('/', ip_allowlistController.create);
router.put('/:id', ip_allowlistController.update);
router.delete('/:id', ip_allowlistController.delete);

export default router;
