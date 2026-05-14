import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const partner_integrationsService = new BaseService('partner_integrations', 'integration_id');
const partner_integrationsController = new BaseController(partner_integrationsService);

// Require authentication
router.use(authenticate);

// CRUD routes for partner_integrations
router.get('/', partner_integrationsController.getAll);
router.get('/search', partner_integrationsController.search);
router.get('/:id', partner_integrationsController.getById);
router.post('/', partner_integrationsController.create);
router.put('/:id', partner_integrationsController.update);
router.delete('/:id', partner_integrationsController.delete);

export default router;
