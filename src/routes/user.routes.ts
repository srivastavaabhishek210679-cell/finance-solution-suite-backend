import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { UserService } from '../services/user.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const userService = new UserService();
const userController = new BaseController(userService);

// All routes require authentication
router.use(authenticate);

// Standard CRUD routes
router.get('/', userController.getAll);
router.get('/search', userController.search);
router.get('/:id', userController.getById);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.delete('/:id', userController.delete);

export default router;
