import { Router } from 'express';
import { BotConfigController } from './bot-config.controller';
import { requireAuth } from '../../shared/middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', BotConfigController.getConfig);
router.put('/', BotConfigController.updateConfig);

export default router;
