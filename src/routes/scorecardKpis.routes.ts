import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const scorecard_kpisService = new BaseService('scorecard_kpis', 'scorecard_kpi_id');
const scorecard_kpisController = new BaseController(scorecard_kpisService);

// Require authentication
router.use(authenticate);

// CRUD routes for scorecard_kpis
router.get('/', scorecard_kpisController.getAll);
router.get('/search', scorecard_kpisController.search);
router.get('/:id', scorecard_kpisController.getById);
router.post('/', scorecard_kpisController.create);
router.put('/:id', scorecard_kpisController.update);
router.delete('/:id', scorecard_kpisController.delete);

export default router;
