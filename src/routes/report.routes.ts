import { Router } from 'express';
import reportsMasterRoutes from './reportsMaster.routes';
import reportDataRoutes from './reportData.routes';
import reportKpisRoutes from './reportKpis.routes';
import reportFiltersRoutes from './reportFilters.routes';
import reportTemplatesRoutes from './reportTemplates.routes';
import reportVersionsRoutes from './reportVersions.routes';
import reportCommentsRoutes from './reportComments.routes';
import reportTagsRoutes from './reportTags.routes';
import reportSubscriptionsRoutes from './reportSubscriptions.routes';
import exportHistoryRoutes from './exportHistory.routes';
import kpiBenchmarksRoutes from './kpiBenchmarks.routes';
import reportRunHistoryRoutes from './reportRunHistory.routes';
import reportApprovalsRoutes from './reportApprovals.routes';
import reportSharingRoutes from './reportSharing.routes';

const router = Router();

// Mount all report-related routes
router.use('/master', reportsMasterRoutes);
router.use('/data', reportDataRoutes);
router.use('/kpis', reportKpisRoutes);
router.use('/filters', reportFiltersRoutes);
router.use('/templates', reportTemplatesRoutes);
router.use('/versions', reportVersionsRoutes);
router.use('/comments', reportCommentsRoutes);
router.use('/tags', reportTagsRoutes);
router.use('/subscriptions', reportSubscriptionsRoutes);
router.use('/export-history', exportHistoryRoutes);
router.use('/benchmarks', kpiBenchmarksRoutes);
router.use('/run-history', reportRunHistoryRoutes);
router.use('/approvals', reportApprovalsRoutes);
router.use('/sharing', reportSharingRoutes);

export default router;
