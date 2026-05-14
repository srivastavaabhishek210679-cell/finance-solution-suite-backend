import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const workflow_definitionsService = new BaseService('workflow_definitions', 'workflow_id');
const workflow_definitionsController = new BaseController(workflow_definitionsService);

// Require authentication
router.use(authenticate);

// CRUD routes for workflow_definitions
router.get('/', workflow_definitionsController.getAll);
router.get('/search', workflow_definitionsController.search);
router.get('/:id', workflow_definitionsController.getById);
router.post('/', workflow_definitionsController.create);
router.put('/:id', workflow_definitionsController.update);
router.delete('/:id', workflow_definitionsController.delete);

export default router;
