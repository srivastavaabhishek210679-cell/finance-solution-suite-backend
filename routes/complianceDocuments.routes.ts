import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const compliance_documentsService = new BaseService('compliance_documents', 'doc_id');
const compliance_documentsController = new BaseController(compliance_documentsService);

// Require authentication
router.use(authenticate);

// CRUD routes for compliance_documents
router.get('/', compliance_documentsController.getAll);
router.get('/search', compliance_documentsController.search);
router.get('/:id', compliance_documentsController.getById);
router.post('/', compliance_documentsController.create);
router.put('/:id', compliance_documentsController.update);
router.delete('/:id', compliance_documentsController.delete);

export default router;
