import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const data_consentService = new BaseService('data_consent', 'consent_id');
const data_consentController = new BaseController(data_consentService);

// Require authentication
router.use(authenticate);

// CRUD routes for data_consent
router.get('/', data_consentController.getAll);
router.get('/search', data_consentController.search);
router.get('/:id', data_consentController.getById);
router.post('/', data_consentController.create);
router.put('/:id', data_consentController.update);
router.delete('/:id', data_consentController.delete);

export default router;
