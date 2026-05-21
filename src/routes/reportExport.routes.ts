import { Router } from 'express';
import { ReportExportController } from '../controllers/reportExport.controller';

const router     = Router();
const controller = new ReportExportController();

// Public — no auth needed for report exports
// GET /api/v1/reports/export?format=csv|excel|pdf&domain=Finance&limit=500
router.get('/',    controller.exportReports.bind(controller));

// GET /api/v1/reports/export/:id?format=csv|excel|pdf
router.get('/:id', controller.exportSingleReport.bind(controller));

export default router;
