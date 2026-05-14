import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const approval_workflowsService = new BaseService('approval_workflows', 'workflow_id');
const approval_workflowsController = new BaseController(approval_workflowsService);

// Require authentication
router.use(authenticate);

// CRUD routes for approval_workflows
router.get('/', approval_workflowsController.getAll);
router.get('/search', approval_workflowsController.search);
router.get('/:id', approval_workflowsController.getById);
router.post('/', approval_workflowsController.create);
router.put('/:id', approval_workflowsController.update);
router.delete('/:id', approval_workflowsController.delete);

export default router;
