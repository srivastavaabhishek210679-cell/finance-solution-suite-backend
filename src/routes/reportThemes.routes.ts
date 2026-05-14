import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_themesService = new BaseService('report_themes', 'theme_id');
const report_themesController = new BaseController(report_themesService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_themes
router.get('/', report_themesController.getAll);
router.get('/search', report_themesController.search);
router.get('/:id', report_themesController.getById);
router.post('/', report_themesController.create);
router.put('/:id', report_themesController.update);
router.delete('/:id', report_themesController.delete);

export default router;
