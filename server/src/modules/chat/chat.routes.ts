import { Router } from 'express';
import { ChatController } from './chat.controller';
import { requireAuth } from '../../shared/middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', ChatController.getConversations);
router.get('/:id/messages', ChatController.getMessages);
router.post('/:id/messages', ChatController.sendMessage);
router.delete('/:id', ChatController.softDelete);
router.post('/:id/restore', ChatController.restore);
router.patch('/contacts/:id/toggle-ai', ChatController.toggleAi);

export default router;
