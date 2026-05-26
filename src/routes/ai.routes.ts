import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.post('/narrative', aiController.generateNarrative);

export default router;
