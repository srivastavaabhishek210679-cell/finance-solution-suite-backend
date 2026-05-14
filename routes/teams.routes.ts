import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const teamsService = new BaseService('teams', 'team_id');
const teamsController = new BaseController(teamsService);

// Require authentication
router.use(authenticate);

// CRUD routes for teams
router.get('/', teamsController.getAll);
router.get('/search', teamsController.search);
router.get('/:id', teamsController.getById);
router.post('/', teamsController.create);
router.put('/:id', teamsController.update);
router.delete('/:id', teamsController.delete);

export default router;
