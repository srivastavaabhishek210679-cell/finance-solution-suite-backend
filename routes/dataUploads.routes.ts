import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const data_uploadsService = new BaseService('data_uploads', 'upload_id');
const data_uploadsController = new BaseController(data_uploadsService);

// Require authentication
router.use(authenticate);

// CRUD routes for data_uploads
router.get('/', data_uploadsController.getAll);
router.get('/search', data_uploadsController.search);
router.get('/:id', data_uploadsController.getById);
router.post('/', data_uploadsController.create);
router.put('/:id', data_uploadsController.update);
router.delete('/:id', data_uploadsController.delete);

export default router;
