import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_tagsService = new BaseService('report_tags', 'tag_id');
const report_tagsController = new BaseController(report_tagsService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_tags
router.get('/', report_tagsController.getAll);
router.get('/search', report_tagsController.search);
router.get('/:id', report_tagsController.getById);
router.post('/', report_tagsController.create);
router.put('/:id', report_tagsController.update);
router.delete('/:id', report_tagsController.delete);

export default router;
