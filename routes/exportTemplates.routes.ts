import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const export_templatesService = new BaseService('export_templates', 'template_id');
const export_templatesController = new BaseController(export_templatesService);

// Require authentication
router.use(authenticate);

// CRUD routes for export_templates
router.get('/', export_templatesController.getAll);
router.get('/search', export_templatesController.search);
router.get('/:id', export_templatesController.getById);
router.post('/', export_templatesController.create);
router.put('/:id', export_templatesController.update);
router.delete('/:id', export_templatesController.delete);

export default router;
