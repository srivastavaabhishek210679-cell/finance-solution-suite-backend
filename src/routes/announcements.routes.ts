import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const announcementsService = new BaseService('announcements', 'announcement_id');
const announcementsController = new BaseController(announcementsService);

// Require authentication
router.use(authenticate);

// CRUD routes for announcements
router.get('/', announcementsController.getAll);
router.get('/search', announcementsController.search);
router.get('/:id', announcementsController.getById);
router.post('/', announcementsController.create);
router.put('/:id', announcementsController.update);
router.delete('/:id', announcementsController.delete);

export default router;
