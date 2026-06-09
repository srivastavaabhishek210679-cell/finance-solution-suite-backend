import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate }   from '../middleware/auth';
import { validate }       from '../middleware/validate';
import Joi                from 'joi';

const router         = Router();
const authController = new AuthController();

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

// Flexible register schema — supports both self-service and admin-invite flows
const registerSchema = Joi.object({
  // Self-service flow (company_name required, tenant_id/role_id optional)
  company_name:  Joi.string().min(2).max(255).optional(),
  first_name:    Joi.string().min(2).max(100).required(),
  last_name:     Joi.string().min(2).max(100).required(),
  email:         Joi.string().email().required(),
  phone_number:  Joi.string().optional().allow(''),
  password:      Joi.string().min(8).required(),
  // Legacy admin-invite flow
  tenant_id:     Joi.number().integer().optional(),
  role_id:       Joi.number().integer().optional(),
}).or('company_name', 'tenant_id'); // at least one must be provided

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token:           Joi.string().min(32).required(),
  password:        Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).optional(),
});

const refreshSchema = Joi.object({
  token: Joi.string().required(),
});

router.post('/login',           validate(loginSchema),           authController.login);
router.post('/register',        validate(registerSchema),        authController.register);
router.post('/refresh',         validate(refreshSchema),         authController.refreshToken);
router.get( '/me',              authenticate,                    authController.getCurrentUser);
router.post('/forgot-password', validate(forgotPasswordSchema),  authController.forgotPassword);
router.post('/reset-password',  validate(resetPasswordSchema),   authController.resetPassword);

export default router;
