import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const reports_masterService = new BaseService('reports_master', 'report_id');
const reports_masterController = new BaseController(reports_masterService);

// Require authentication
router.use(authenticate);

// CRUD routes for reports_master
router.get('/', reports_masterController.getAll);
router.get('/search', reports_masterController.search);
router.get('/:id', reports_masterController.getById);
router.post('/', reports_masterController.create);
router.put('/:id', reports_masterController.update);
router.delete('/:id', reports_masterController.delete);

export default router;
