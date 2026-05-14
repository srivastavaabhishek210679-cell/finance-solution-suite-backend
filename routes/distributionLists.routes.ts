import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const distribution_listsService = new BaseService('distribution_lists', 'list_id');
const distribution_listsController = new BaseController(distribution_listsService);

// Require authentication
router.use(authenticate);

// CRUD routes for distribution_lists
router.get('/', distribution_listsController.getAll);
router.get('/search', distribution_listsController.search);
router.get('/:id', distribution_listsController.getById);
router.post('/', distribution_listsController.create);
router.put('/:id', distribution_listsController.update);
router.delete('/:id', distribution_listsController.delete);

export default router;
