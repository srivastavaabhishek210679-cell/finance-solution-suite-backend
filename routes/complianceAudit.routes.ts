import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const compliance_auditService = new BaseService('compliance_audit', 'audit_id');
const compliance_auditController = new BaseController(compliance_auditService);

// Require authentication
router.use(authenticate);

// CRUD routes for compliance_audit
router.get('/', compliance_auditController.getAll);
router.get('/search', compliance_auditController.search);
router.get('/:id', compliance_auditController.getById);
router.post('/', compliance_auditController.create);
router.put('/:id', compliance_auditController.update);
router.delete('/:id', compliance_auditController.delete);

export default router;
