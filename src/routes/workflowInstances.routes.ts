import { Router } from 'express';
import { WorkflowController } from '../controllers/workflow.controller';
import { authenticate } from '../middleware/auth';

const router     = Router();
const controller = new WorkflowController();

// ── Public GET routes ──────────────────────────────────────────
router.get('/',    controller.getAllInstances.bind(controller));
router.get('/:id', controller.getInstanceById.bind(controller));

// ── Protected write routes ─────────────────────────────────────
router.delete('/:id', authenticate, (req, res) => {
  res.json({ message: 'Instance deletion not supported' });
});

export default router;
