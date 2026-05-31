import { Router } from 'express';
import { mfaController } from '../controllers/mfa.controller';
const router = Router();
router.post('/send-otp', mfaController.sendOTP);
router.post('/verify-otp', mfaController.verifyOTP);
router.get('/status', mfaController.getMFAStatus);
router.post('/toggle', mfaController.toggleMFA);
export default router;