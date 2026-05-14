import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const report_commentsService = new BaseService('report_comments', 'comment_id');
const report_commentsController = new BaseController(report_commentsService);

// Require authentication
router.use(authenticate);

// CRUD routes for report_comments
router.get('/', report_commentsController.getAll);
router.get('/search', report_commentsController.search);
router.get('/:id', report_commentsController.getById);
router.post('/', report_commentsController.create);
router.put('/:id', report_commentsController.update);
router.delete('/:id', report_commentsController.delete);

export default router;
