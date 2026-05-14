import { Router } from 'express';
import forecastModelsRoutes from './forecastModels.routes';
import aiInsightsRoutes from './aiInsights.routes';
import recommendationsRoutes from './recommendations.routes';
import anomalyLogsRoutes from './anomalyLogs.routes';
import trendAnalysisRoutes from './trendAnalysis.routes';

const router = Router();

router.use('/forecast-models', forecastModelsRoutes);
router.use('/insights', aiInsightsRoutes);
router.use('/recommendations', recommendationsRoutes);
router.use('/anomalies', anomalyLogsRoutes);
router.use('/trends', trendAnalysisRoutes);

export default router;
