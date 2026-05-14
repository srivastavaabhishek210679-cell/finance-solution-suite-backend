import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();
const analyticsController = new AnalyticsController();

// Test route
router.get('/test', analyticsController.test.bind(analyticsController));

// Analytics endpoints
router.get('/summary', analyticsController.getSummary.bind(analyticsController));
router.get('/reports-by-domain', analyticsController.getReportsByDomain.bind(analyticsController));
router.get('/reports-by-frequency', analyticsController.getReportsByFrequency.bind(analyticsController));
router.get('/reports-by-compliance', analyticsController.getReportsByCompliance.bind(analyticsController));
router.get('/submission-trends', analyticsController.getSubmissionTrends.bind(analyticsController));
router.get('/reports-by-stakeholder', analyticsController.getReportsByStakeholder.bind(analyticsController));
router.get('/frequency-distribution', analyticsController.getFrequencyDistribution.bind(analyticsController));
router.get('/compliance-metrics', analyticsController.getComplianceMetrics.bind(analyticsController));

export default router;
