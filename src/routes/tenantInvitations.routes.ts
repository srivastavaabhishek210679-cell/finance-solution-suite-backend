import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const tenant_invitationsService = new BaseService('tenant_invitations', 'invitation_id');
const tenant_invitationsController = new BaseController(tenant_invitationsService);

// Require authentication
router.use(authenticate);

// CRUD routes for tenant_invitations
router.get('/', tenant_invitationsController.getAll);
router.get('/search', tenant_invitationsController.search);
router.get('/:id', tenant_invitationsController.getById);
router.post('/', tenant_invitationsController.create);
router.put('/:id', tenant_invitationsController.update);
router.delete('/:id', tenant_invitationsController.delete);

export default router;
