import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const job_queueService = new BaseService('job_queue', 'job_id');
const job_queueController = new BaseController(job_queueService);

// Require authentication
router.use(authenticate);

// CRUD routes for job_queue
router.get('/', job_queueController.getAll);
router.get('/search', job_queueController.search);
router.get('/:id', job_queueController.getById);
router.post('/', job_queueController.create);
router.put('/:id', job_queueController.update);
router.delete('/:id', job_queueController.delete);

export default router;
