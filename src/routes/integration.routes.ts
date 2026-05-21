import { Router } from 'express';
import { IntegrationController } from '../controllers/integration.controller';
import { authenticate } from '../middleware/auth';

const router     = Router();
const controller = new IntegrationController();

// ── Public GET routes ──────────────────────────────────────────
router.get('/sync/status',                    controller.getSyncStatus.bind(controller));
router.get('/oauth/:platform/authorize',      controller.oauthAuthorize.bind(controller));
router.get('/',                               controller.getAll.bind(controller));
router.get('/:id',                            controller.getById.bind(controller));

// ── Protected routes ───────────────────────────────────────────
router.post('/:id/sync',                      authenticate, controller.triggerSync.bind(controller));
router.post('/:id/credentials',               authenticate, controller.saveCredentials.bind(controller));
router.post('/oauth/:platform/callback',      authenticate, controller.oauthCallback.bind(controller));
router.put('/:id/toggle',                     authenticate, controller.toggle.bind(controller));

export default router;
