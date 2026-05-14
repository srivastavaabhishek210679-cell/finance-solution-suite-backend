import { Router } from 'express';
import dashboardsRoutes from './dashboards.routes';
import dashboardWidgetsRoutes from './dashboardWidgets.routes';

const router = Router();

// Mount dashboard routes
router.use('/', dashboardsRoutes);
router.use('/widgets', dashboardWidgetsRoutes);

export default router;
