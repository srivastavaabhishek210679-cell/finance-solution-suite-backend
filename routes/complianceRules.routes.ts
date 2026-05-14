import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const compliance_rulesService = new BaseService('compliance_rules', 'rule_id');
const compliance_rulesController = new BaseController(compliance_rulesService);

// Require authentication
router.use(authenticate);

// CRUD routes for compliance_rules
router.get('/', compliance_rulesController.getAll);
router.get('/search', compliance_rulesController.search);
router.get('/:id', compliance_rulesController.getById);
router.post('/', compliance_rulesController.create);
router.put('/:id', compliance_rulesController.update);
router.delete('/:id', compliance_rulesController.delete);

export default router;
