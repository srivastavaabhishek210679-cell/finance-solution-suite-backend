import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate }   from '../middleware/auth';
import { validate }       from '../middleware/validate';
import Joi                from 'joi';

const router         = Router();
const authController = new AuthController();

// ── Validation schemas ────────────────────────────────────────────────────────
const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const registerSchema = Joi.object({
  tenant_id: Joi.number().integer().optional(),
  first_name:   Joi.string().min(2).max(100).required(),
  last_name:    Joi.string().min(2).max(100).required(),
  email:        Joi.string().email().required(),
  phone_number: Joi.string().optional().allow(''),
  password:     Joi.string().min(8).required(),
  role_id: Joi.number().integer().optional(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required',
  }),
});

const resetPasswordSchema = Joi.object({
  token:    Joi.string().min(32).required().messages({
    'any.required': 'Reset token is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min':   'Password must be at least 8 characters',
    'any.required': 'New password is required',
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).optional().messages({
    'any.only': 'Passwords do not match',
  }),
});

const refreshSchema = Joi.object({
  token: Joi.string().required(),
});

// ── Routes ────────────────────────────────────────────────────────────────────
router.post('/login',           validate(loginSchema),           authController.login);
router.post('/register',        validate(registerSchema),        authController.register);
router.post('/refresh',         validate(refreshSchema),         authController.refreshToken);
router.get( '/me',              authenticate,                    authController.getCurrentUser);

// Password reset flow
router.post('/forgot-password', validate(forgotPasswordSchema),  authController.forgotPassword);
router.post('/reset-password',  validate(resetPasswordSchema),   authController.resetPassword);

export default router;


