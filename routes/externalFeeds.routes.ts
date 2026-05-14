import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const external_feedsService = new BaseService('external_feeds', 'feed_id');
const external_feedsController = new BaseController(external_feedsService);

// Require authentication
router.use(authenticate);

// CRUD routes for external_feeds
router.get('/', external_feedsController.getAll);
router.get('/search', external_feedsController.search);
router.get('/:id', external_feedsController.getById);
router.post('/', external_feedsController.create);
router.put('/:id', external_feedsController.update);
router.delete('/:id', external_feedsController.delete);

export default router;
