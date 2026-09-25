import { Router } from 'express';
import { UserController } from './user.controller';
import { requireAuth, requireAdmin } from '../../shared/middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/', UserController.getUsers);
router.post('/', UserController.createUser);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);
router.post('/:id/restore', UserController.restoreUser);
router.post('/:id/terminate', UserController.emergencyTerminate);
router.post('/:id/impersonate', UserController.impersonateUser);
router.patch('/:id/subscription', UserController.updateSubscription);

export default router;
