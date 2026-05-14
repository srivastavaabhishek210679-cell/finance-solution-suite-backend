import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const team_membersService = new BaseService('team_members', 'member_id');
const team_membersController = new BaseController(team_membersService);

// Require authentication
router.use(authenticate);

// CRUD routes for team_members
router.get('/', team_membersController.getAll);
router.get('/search', team_membersController.search);
router.get('/:id', team_membersController.getById);
router.post('/', team_membersController.create);
router.put('/:id', team_membersController.update);
router.delete('/:id', team_membersController.delete);

export default router;
