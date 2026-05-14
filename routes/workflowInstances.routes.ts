import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const workflow_instancesService = new BaseService('workflow_instances', 'instance_id');
const workflow_instancesController = new BaseController(workflow_instancesService);

// Require authentication
router.use(authenticate);

// CRUD routes for workflow_instances
router.get('/', workflow_instancesController.getAll);
router.get('/search', workflow_instancesController.search);
router.get('/:id', workflow_instancesController.getById);
router.post('/', workflow_instancesController.create);
router.put('/:id', workflow_instancesController.update);
router.delete('/:id', workflow_instancesController.delete);

export default router;
