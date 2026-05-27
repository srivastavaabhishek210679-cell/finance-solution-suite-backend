import { Router } from 'express';
import { collaborationController } from '../controllers/collaboration.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', collaborationController.getRooms);
router.post('/', collaborationController.createRoom);
router.get('/:roomId/comments', collaborationController.getComments);
router.post('/:roomId/comments', collaborationController.addComment);
router.delete('/:id', collaborationController.deleteRoom);

export default router;