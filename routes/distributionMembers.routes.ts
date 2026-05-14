import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const distribution_membersService = new BaseService('distribution_members', 'member_id');
const distribution_membersController = new BaseController(distribution_membersService);

// Require authentication
router.use(authenticate);

// CRUD routes for distribution_members
router.get('/', distribution_membersController.getAll);
router.get('/search', distribution_membersController.search);
router.get('/:id', distribution_membersController.getById);
router.post('/', distribution_membersController.create);
router.put('/:id', distribution_membersController.update);
router.delete('/:id', distribution_membersController.delete);

export default router;
