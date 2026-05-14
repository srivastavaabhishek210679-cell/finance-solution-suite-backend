import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_bookmarksService = new BaseService('report_bookmarks', 'bookmark_id');
const report_bookmarksController = new BaseController(report_bookmarksService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_bookmarks
router.get('/', report_bookmarksController.getAll);
router.get('/search', report_bookmarksController.search);
router.get('/:id', report_bookmarksController.getById);
router.post('/', report_bookmarksController.create);
router.put('/:id', report_bookmarksController.update);
router.delete('/:id', report_bookmarksController.delete);

export default router;
