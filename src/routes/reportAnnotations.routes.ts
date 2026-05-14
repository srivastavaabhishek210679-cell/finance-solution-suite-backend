import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_annotationsService = new BaseService('report_annotations', 'annotation_id');
const report_annotationsController = new BaseController(report_annotationsService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_annotations
router.get('/', report_annotationsController.getAll);
router.get('/search', report_annotationsController.search);
router.get('/:id', report_annotationsController.getById);
router.post('/', report_annotationsController.create);
router.put('/:id', report_annotationsController.update);
router.delete('/:id', report_annotationsController.delete);

export default router;
