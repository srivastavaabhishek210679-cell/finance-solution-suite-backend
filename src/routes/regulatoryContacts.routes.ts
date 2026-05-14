import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const regulatory_contactsService = new BaseService('regulatory_contacts', 'contact_id');
const regulatory_contactsController = new BaseController(regulatory_contactsService);

// Require authentication
router.use(authenticate);

// CRUD routes for regulatory_contacts
router.get('/', regulatory_contactsController.getAll);
router.get('/search', regulatory_contactsController.search);
router.get('/:id', regulatory_contactsController.getById);
router.post('/', regulatory_contactsController.create);
router.put('/:id', regulatory_contactsController.update);
router.delete('/:id', regulatory_contactsController.delete);

export default router;
