import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const user_devicesService = new BaseService('user_devices', 'device_id');
const user_devicesController = new BaseController(user_devicesService);

// Require authentication
router.use(authenticate);

// CRUD routes for user_devices
router.get('/', user_devicesController.getAll);
router.get('/search', user_devicesController.search);
router.get('/:id', user_devicesController.getById);
router.post('/', user_devicesController.create);
router.put('/:id', user_devicesController.update);
router.delete('/:id', user_devicesController.delete);

export default router;
