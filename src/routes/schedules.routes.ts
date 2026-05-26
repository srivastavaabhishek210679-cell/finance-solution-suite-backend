import { Router } from 'express';
import { scheduleController } from '../controllers/schedule.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/',          scheduleController.getAll);
router.post('/',         scheduleController.create);
router.put('/:id',       scheduleController.update);
router.patch('/:id/toggle', scheduleController.toggle);
router.delete('/:id',    scheduleController.delete);
router.post('/:id/send', scheduleController.sendNow);

export default router;
