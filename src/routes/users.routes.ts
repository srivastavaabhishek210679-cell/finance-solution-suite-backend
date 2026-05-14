import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const usersService = new BaseService('users', 'user_id');
const usersController = new BaseController(usersService);

// Require authentication
router.use(authenticate);

// CRUD routes for users
router.get('/', usersController.getAll);
router.get('/search', usersController.search);
router.get('/:id', usersController.getById);
router.post('/', usersController.create);
router.put('/:id', usersController.update);
router.delete('/:id', usersController.delete);

export default router;
