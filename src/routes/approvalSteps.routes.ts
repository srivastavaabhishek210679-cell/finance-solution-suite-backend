import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const approval_stepsService = new BaseService('approval_steps', 'step_id');
const approval_stepsController = new BaseController(approval_stepsService);

// Require authentication
router.use(authenticate);

// CRUD routes for approval_steps
router.get('/', approval_stepsController.getAll);
router.get('/search', approval_stepsController.search);
router.get('/:id', approval_stepsController.getById);
router.post('/', approval_stepsController.create);
router.put('/:id', approval_stepsController.update);
router.delete('/:id', approval_stepsController.delete);

export default router;
