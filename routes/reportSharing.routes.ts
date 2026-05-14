import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_sharingService = new BaseService('report_sharing', 'share_id');
const report_sharingController = new BaseController(report_sharingService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_sharing
router.get('/', report_sharingController.getAll);
router.get('/search', report_sharingController.search);
router.get('/:id', report_sharingController.getById);
router.post('/', report_sharingController.create);
router.put('/:id', report_sharingController.update);
router.delete('/:id', report_sharingController.delete);

export default router;
