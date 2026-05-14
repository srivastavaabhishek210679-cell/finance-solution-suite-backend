import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const data_masking_rulesService = new BaseService('data_masking_rules', 'rule_id');
const data_masking_rulesController = new BaseController(data_masking_rulesService);

// Require authentication
router.use(authenticate);

// CRUD routes for data_masking_rules
router.get('/', data_masking_rulesController.getAll);
router.get('/search', data_masking_rulesController.search);
router.get('/:id', data_masking_rulesController.getById);
router.post('/', data_masking_rulesController.create);
router.put('/:id', data_masking_rulesController.update);
router.delete('/:id', data_masking_rulesController.delete);

export default router;
