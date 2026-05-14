import { Router } from 'express';
import complianceRulesRoutes from './complianceRules.routes';
import complianceCalendarRoutes from './complianceCalendar.routes';
import regulatoryContactsRoutes from './regulatoryContacts.routes';
import complianceSubmissionsRoutes from './complianceSubmissions.routes';
import complianceAuditRoutes from './complianceAudit.routes';

const router = Router();

router.use('/rules', complianceRulesRoutes);
router.use('/calendar', complianceCalendarRoutes);
router.use('/contacts', regulatoryContactsRoutes);
router.use('/submissions', complianceSubmissionsRoutes);
router.use('/audit', complianceAuditRoutes);

export default router;
