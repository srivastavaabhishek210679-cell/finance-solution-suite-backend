import { Router } from 'express';
import { reportViewerController } from '../controllers/reportViewer.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/:id', reportViewerController.getReportData);

export default router;