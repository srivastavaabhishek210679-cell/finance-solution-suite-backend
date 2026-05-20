import { Router } from 'express';
import { WorkflowController } from '../controllers/workflow.controller';
import { authenticate } from '../middleware/auth';

const router     = Router();
const controller = new WorkflowController();

// ── Public GET routes ──────────────────────────────────────────
router.get('/summary',    controller.getSummary.bind(controller));
router.get('/',           controller.getAllDefinitions.bind(controller));
router.get('/:id/stats',  controller.getDefinitionStats.bind(controller));
router.get('/:id',        controller.getDefinitionById.bind(controller));

// ── Protected write + action routes ───────────────────────────
router.post('/',           authenticate, controller.createDefinition.bind(controller));
router.post('/:id/toggle', authenticate, controller.toggleDefinition.bind(controller));
router.put('/:id',         authenticate, controller.updateDefinition.bind(controller));
router.delete('/:id',      authenticate, controller.deleteDefinition.bind(controller));

export default router;
