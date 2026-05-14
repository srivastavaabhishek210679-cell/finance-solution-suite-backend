import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const data_ingestion_logsService = new BaseService('data_ingestion_logs', 'log_id');
const data_ingestion_logsController = new BaseController(data_ingestion_logsService);

// Require authentication
router.use(authenticate);

// CRUD routes for data_ingestion_logs
router.get('/', data_ingestion_logsController.getAll);
router.get('/search', data_ingestion_logsController.search);
router.get('/:id', data_ingestion_logsController.getById);
router.post('/', data_ingestion_logsController.create);
router.put('/:id', data_ingestion_logsController.update);
router.delete('/:id', data_ingestion_logsController.delete);

export default router;
