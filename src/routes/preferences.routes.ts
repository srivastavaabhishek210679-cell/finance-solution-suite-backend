import { Router } from 'express';
import { preferencesController } from '../controllers/preferences.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', preferencesController.get);
router.post('/', preferencesController.save);

export default router;