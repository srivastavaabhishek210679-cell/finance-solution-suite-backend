import { Router } from 'express';
import chatSessionsRoutes from './chatSessions.routes';
import chatQueriesRoutes from './chatQueries.routes';
import chatResponsesRoutes from './chatResponses.routes';
import chatFeedbackRoutes from './chatFeedback.routes';

const router = Router();

router.use('/sessions', chatSessionsRoutes);
router.use('/queries', chatQueriesRoutes);
router.use('/responses', chatResponsesRoutes);
router.use('/feedback', chatFeedbackRoutes);

export default router;
