import { Router } from 'express';
import { ComplianceCalendarController } from '../controllers/complianceCalendar.controller';
import { authenticate } from '../middleware/auth';

const router     = Router();
const controller = new ComplianceCalendarController();

// ── Public GET routes (no auth — frontend reads without login) ──
router.get('/',         controller.getAll.bind(controller));
router.get('/:id',      controller.getById.bind(controller));

// ── Protected write routes (require auth) ──────────────────────
router.post('/',        authenticate, controller.create.bind(controller));
router.put('/:id',      authenticate, controller.update.bind(controller));
router.delete('/:id',   authenticate, controller.delete.bind(controller));

export default router;
