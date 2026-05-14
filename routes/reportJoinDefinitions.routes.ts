import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_join_definitionsService = new BaseService('report_join_definitions', 'join_id');
const report_join_definitionsController = new BaseController(report_join_definitionsService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_join_definitions
router.get('/', report_join_definitionsController.getAll);
router.get('/search', report_join_definitionsController.search);
router.get('/:id', report_join_definitionsController.getById);
router.post('/', report_join_definitionsController.create);
router.put('/:id', report_join_definitionsController.update);
router.delete('/:id', report_join_definitionsController.delete);

export default router;
