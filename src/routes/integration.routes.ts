import { Router } from 'express';
import { integrationController } from '../controllers/integration.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', integrationController.getAll);
router.post('/:id/connect', integrationController.connect);
router.post('/:id/disconnect', integrationController.disconnect);
router.post('/:id/sync', integrationController.sync);
router.put('/:id/config', integrationController.updateConfig);

export default router;