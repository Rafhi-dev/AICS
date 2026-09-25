import { Router } from 'express';
import { WhatsAppController } from './whatsapp.controller';
import { requireAuth, requireActiveSubscription } from '../../shared/middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/status', WhatsAppController.getStatus);
router.post('/init', requireActiveSubscription, WhatsAppController.init);
router.post('/restart', requireActiveSubscription, WhatsAppController.restart);
router.post('/logout', WhatsAppController.logout);

export default router;
