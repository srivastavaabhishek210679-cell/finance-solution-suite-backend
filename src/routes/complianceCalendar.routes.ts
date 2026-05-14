import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const compliance_calendarService = new BaseService('compliance_calendar', 'event_id');
const compliance_calendarController = new BaseController(compliance_calendarService);

// Require authentication
router.use(authenticate);

// CRUD routes for compliance_calendar
router.get('/', compliance_calendarController.getAll);
router.get('/search', compliance_calendarController.search);
router.get('/:id', compliance_calendarController.getById);
router.post('/', compliance_calendarController.create);
router.put('/:id', compliance_calendarController.update);
router.delete('/:id', compliance_calendarController.delete);

export default router;
