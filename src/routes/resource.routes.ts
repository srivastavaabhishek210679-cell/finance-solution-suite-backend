import { Router } from 'express';
import { resourceController } from '../controllers/resource.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/resources', resourceController.getResources);
router.post('/resources', resourceController.createResource);
router.put('/resources/:id', resourceController.updateResource);
router.get('/projects', resourceController.getProjects);
router.post('/projects', resourceController.createProject);
router.put('/projects/:id', resourceController.updateProject);
router.get('/allocations', resourceController.getAllocations);
router.post('/allocations', resourceController.createAllocation);
router.delete('/allocations/:id', resourceController.deleteAllocation);
router.get('/stats', resourceController.getStats);

export default router;