import { Router } from 'express';
import { projectController } from '../controllers/project.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', projectController.getProjects);
router.post('/', projectController.createProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.get('/:projectId/tasks', projectController.getTasks);
router.post('/tasks', projectController.createTask);
router.put('/tasks/:id', projectController.updateTask);
router.delete('/tasks/:id', projectController.deleteTask);
router.get('/:projectId/milestones', projectController.getMilestones);
router.post('/milestones', projectController.createMilestone);
router.put('/milestones/:id', projectController.updateMilestone);
router.get('/stats', projectController.getStats);

export default router;