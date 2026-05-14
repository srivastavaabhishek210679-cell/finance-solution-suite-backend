import { Router } from 'express';
import dataSourcesRoutes from './dataSources.routes';
import dataUploadsRoutes from './dataUploads.routes';
import etlJobsRoutes from './etlJobs.routes';
import sourceMappingsRoutes from './sourceMappings.routes';
import dataValidationRulesRoutes from './dataValidationRules.routes';

const router = Router();

// Mount data integration routes
router.use('/', dataSourcesRoutes);
router.use('/uploads', dataUploadsRoutes);
router.use('/etl-jobs', etlJobsRoutes);
router.use('/mappings', sourceMappingsRoutes);
router.use('/validation-rules', dataValidationRulesRoutes);

export default router;
