import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const upload_validation_rulesService = new BaseService('upload_validation_rules', 'rule_id');
const upload_validation_rulesController = new BaseController(upload_validation_rulesService);

// Require authentication
router.use(authenticate);

// CRUD routes for upload_validation_rules
router.get('/', upload_validation_rulesController.getAll);
router.get('/search', upload_validation_rulesController.search);
router.get('/:id', upload_validation_rulesController.getById);
router.post('/', upload_validation_rulesController.create);
router.put('/:id', upload_validation_rulesController.update);
router.delete('/:id', upload_validation_rulesController.delete);

export default router;
