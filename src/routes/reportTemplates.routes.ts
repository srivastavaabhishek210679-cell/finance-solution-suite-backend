import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_templatesService = new BaseService('report_templates', 'template_id');
const report_templatesController = new BaseController(report_templatesService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_templates
router.get('/', report_templatesController.getAll);
router.get('/search', report_templatesController.search);
router.get('/:id', report_templatesController.getById);
router.post('/', report_templatesController.create);
router.put('/:id', report_templatesController.update);
router.delete('/:id', report_templatesController.delete);

export default router;
