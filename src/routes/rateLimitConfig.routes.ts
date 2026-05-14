import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const rate_limit_configService = new BaseService('rate_limit_config', 'config_id');
const rate_limit_configController = new BaseController(rate_limit_configService);

// Require authentication
router.use(authenticate);

// CRUD routes for rate_limit_config
router.get('/', rate_limit_configController.getAll);
router.get('/search', rate_limit_configController.search);
router.get('/:id', rate_limit_configController.getById);
router.post('/', rate_limit_configController.create);
router.put('/:id', rate_limit_configController.update);
router.delete('/:id', rate_limit_configController.delete);

export default router;
