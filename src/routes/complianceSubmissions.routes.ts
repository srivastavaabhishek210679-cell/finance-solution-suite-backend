import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const compliance_submissionsService = new BaseService('compliance_submissions', 'submission_id');
const compliance_submissionsController = new BaseController(compliance_submissionsService);

// Require authentication
router.use(authenticate);

// CRUD routes for compliance_submissions
router.get('/', compliance_submissionsController.getAll);
router.get('/search', compliance_submissionsController.search);
router.get('/:id', compliance_submissionsController.getById);
router.post('/', compliance_submissionsController.create);
router.put('/:id', compliance_submissionsController.update);
router.delete('/:id', compliance_submissionsController.delete);

export default router;
