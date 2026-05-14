import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const blockchain_auditService = new BaseService('blockchain_audit', 'chain_id');
const blockchain_auditController = new BaseController(blockchain_auditService);

// Require authentication
router.use(authenticate);

// CRUD routes for blockchain_audit
router.get('/', blockchain_auditController.getAll);
router.get('/search', blockchain_auditController.search);
router.get('/:id', blockchain_auditController.getById);
router.post('/', blockchain_auditController.create);
router.put('/:id', blockchain_auditController.update);
router.delete('/:id', blockchain_auditController.delete);

export default router;
