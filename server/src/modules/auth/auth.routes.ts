import { Router } from 'express';
import { AuthController } from './auth.controller';
import { requireAuth } from '../../shared/middlewares/auth.middleware';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', requireAuth, AuthController.me);
router.put('/profile', requireAuth, AuthController.updateProfile);

export default router;
