import { Router } from 'express';
import { KnowledgeController } from './knowledge.controller';
import { requireAuth, requireActiveSubscription } from '../../shared/middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', KnowledgeController.getItems);
router.post('/', requireActiveSubscription, KnowledgeController.createItem);
router.put('/:id', requireActiveSubscription, KnowledgeController.updateItem);
router.delete('/:id', KnowledgeController.deleteItem);

export default router;
