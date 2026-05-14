import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_fieldsService = new BaseService('report_fields', 'field_id');
const report_fieldsController = new BaseController(report_fieldsService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_fields
router.get('/', report_fieldsController.getAll);
router.get('/search', report_fieldsController.search);
router.get('/:id', report_fieldsController.getById);
router.post('/', report_fieldsController.create);
router.put('/:id', report_fieldsController.update);
router.delete('/:id', report_fieldsController.delete);

export default router;
