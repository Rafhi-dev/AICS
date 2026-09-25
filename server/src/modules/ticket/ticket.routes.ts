import { Router } from 'express';
import { TicketController } from './ticket.controller';
import { requireAuth } from '../../shared/middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', TicketController.getTickets);
router.post('/', TicketController.createTicket);
router.get('/:id', TicketController.getTicketDetail);
router.post('/:id/messages', TicketController.replyTicket);
router.patch('/:id/status', TicketController.updateStatus);

export default router;
