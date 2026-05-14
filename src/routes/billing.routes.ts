import { Router } from 'express';
import billingAccountsRoutes from './billingAccounts.routes';
import usageMetricsRoutes from './usageMetrics.routes';

const router = Router();

router.use('/accounts', billingAccountsRoutes);
router.use('/usage', usageMetricsRoutes);

export default router;
