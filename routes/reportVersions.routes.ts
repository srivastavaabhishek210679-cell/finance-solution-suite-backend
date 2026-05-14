import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_versionsService = new BaseService('report_versions', 'version_id');
const report_versionsController = new BaseController(report_versionsService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_versions
router.get('/', report_versionsController.getAll);
router.get('/search', report_versionsController.search);
router.get('/:id', report_versionsController.getById);
router.post('/', report_versionsController.create);
router.put('/:id', report_versionsController.update);
router.delete('/:id', report_versionsController.delete);

export default router;
