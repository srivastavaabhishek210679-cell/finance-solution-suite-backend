import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const fiscal_calendarsService = new BaseService('fiscal_calendars', 'calendar_id');
const fiscal_calendarsController = new BaseController(fiscal_calendarsService);

// Require authentication
router.use(authenticate);

// CRUD routes for fiscal_calendars
router.get('/', fiscal_calendarsController.getAll);
router.get('/search', fiscal_calendarsController.search);
router.get('/:id', fiscal_calendarsController.getById);
router.post('/', fiscal_calendarsController.create);
router.put('/:id', fiscal_calendarsController.update);
router.delete('/:id', fiscal_calendarsController.delete);

export default router;
