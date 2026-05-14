import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const custom_report_definitionsService = new BaseService('custom_report_definitions', 'custom_report_id');
const custom_report_definitionsController = new BaseController(custom_report_definitionsService);

// Require authentication
router.use(authenticate);

// CRUD routes for custom_report_definitions
router.get('/', custom_report_definitionsController.getAll);
router.get('/search', custom_report_definitionsController.search);
router.get('/:id', custom_report_definitionsController.getById);
router.post('/', custom_report_definitionsController.create);
router.put('/:id', custom_report_definitionsController.update);
router.delete('/:id', custom_report_definitionsController.delete);

export default router;
