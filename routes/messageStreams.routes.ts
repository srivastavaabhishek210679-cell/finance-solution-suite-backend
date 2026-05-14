import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const message_streamsService = new BaseService('message_streams', 'stream_id');
const message_streamsController = new BaseController(message_streamsService);

// Require authentication
router.use(authenticate);

// CRUD routes for message_streams
router.get('/', message_streamsController.getAll);
router.get('/search', message_streamsController.search);
router.get('/:id', message_streamsController.getById);
router.post('/', message_streamsController.create);
router.put('/:id', message_streamsController.update);
router.delete('/:id', message_streamsController.delete);

export default router;
