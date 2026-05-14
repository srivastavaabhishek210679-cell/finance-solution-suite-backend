import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const billing_accountsService = new BaseService('billing_accounts', 'account_id');
const billing_accountsController = new BaseController(billing_accountsService);

// Require authentication
router.use(authenticate);

// CRUD routes for billing_accounts
router.get('/', billing_accountsController.getAll);
router.get('/search', billing_accountsController.search);
router.get('/:id', billing_accountsController.getById);
router.post('/', billing_accountsController.create);
router.put('/:id', billing_accountsController.update);
router.delete('/:id', billing_accountsController.delete);

export default router;
