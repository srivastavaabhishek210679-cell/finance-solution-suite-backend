import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const connector_typesService = new BaseService('connector_types', 'type_id');
const connector_typesController = new BaseController(connector_typesService);

// Require authentication
router.use(authenticate);

// CRUD routes for connector_types
router.get('/', connector_typesController.getAll);
router.get('/search', connector_typesController.search);
router.get('/:id', connector_typesController.getById);
router.post('/', connector_typesController.create);
router.put('/:id', connector_typesController.update);
router.delete('/:id', connector_typesController.delete);

export default router;
