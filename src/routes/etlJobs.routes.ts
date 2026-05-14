import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const etl_jobsService = new BaseService('etl_jobs', 'job_id');
const etl_jobsController = new BaseController(etl_jobsService);

// Require authentication
router.use(authenticate);

// CRUD routes for etl_jobs
router.get('/', etl_jobsController.getAll);
router.get('/search', etl_jobsController.search);
router.get('/:id', etl_jobsController.getById);
router.post('/', etl_jobsController.create);
router.put('/:id', etl_jobsController.update);
router.delete('/:id', etl_jobsController.delete);

export default router;
