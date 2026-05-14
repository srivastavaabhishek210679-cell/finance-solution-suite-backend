import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const scenario_simulationsService = new BaseService('scenario_simulations', 'simulation_id');
const scenario_simulationsController = new BaseController(scenario_simulationsService);

// Require authentication
router.use(authenticate);

// CRUD routes for scenario_simulations
router.get('/', scenario_simulationsController.getAll);
router.get('/search', scenario_simulationsController.search);
router.get('/:id', scenario_simulationsController.getById);
router.post('/', scenario_simulationsController.create);
router.put('/:id', scenario_simulationsController.update);
router.delete('/:id', scenario_simulationsController.delete);

export default router;
