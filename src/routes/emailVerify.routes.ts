import { Router } from 'express';
import { emailVerifyController } from '../controllers/emailVerify.controller';
const router = Router();
router.post('/send', emailVerifyController.sendVerification);
router.get('/verify', emailVerifyController.verifyEmail);
router.get('/check', emailVerifyController.checkVerification);
export default router;