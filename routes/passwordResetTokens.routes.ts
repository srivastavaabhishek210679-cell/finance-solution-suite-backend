import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const password_reset_tokensService = new BaseService('password_reset_tokens', 'token_id');
const password_reset_tokensController = new BaseController(password_reset_tokensService);

// Require authentication
router.use(authenticate);

// CRUD routes for password_reset_tokens
router.get('/', password_reset_tokensController.getAll);
router.get('/search', password_reset_tokensController.search);
router.get('/:id', password_reset_tokensController.getById);
router.post('/', password_reset_tokensController.create);
router.put('/:id', password_reset_tokensController.update);
router.delete('/:id', password_reset_tokensController.delete);

export default router;
