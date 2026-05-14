import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const attachmentsService = new BaseService('attachments', 'attachment_id');
const attachmentsController = new BaseController(attachmentsService);

// Require authentication
router.use(authenticate);

// CRUD routes for attachments
router.get('/', attachmentsController.getAll);
router.get('/search', attachmentsController.search);
router.get('/:id', attachmentsController.getById);
router.post('/', attachmentsController.create);
router.put('/:id', attachmentsController.update);
router.delete('/:id', attachmentsController.delete);

export default router;
