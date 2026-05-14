import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const data_validation_rulesService = new BaseService('data_validation_rules', 'rule_id');
const data_validation_rulesController = new BaseController(data_validation_rulesService);

// Require authentication
router.use(authenticate);

// CRUD routes for data_validation_rules
router.get('/', data_validation_rulesController.getAll);
router.get('/search', data_validation_rulesController.search);
router.get('/:id', data_validation_rulesController.getById);
router.post('/', data_validation_rulesController.create);
router.put('/:id', data_validation_rulesController.update);
router.delete('/:id', data_validation_rulesController.delete);

export default router;
