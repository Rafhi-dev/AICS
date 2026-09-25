import { Request, Response } from 'express';
import { TicketService } from './ticket.service';

export class TicketController {
  public static async getTickets(req: Request, res: Response) {
    try {
      const tickets = await TicketService.getTickets(req.user, req.query);
      res.json({ success: true, data: tickets });
    } catch (err: any) {
      console.error('[Get Tickets Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createTicket(req: Request, res: Response) {
    try {
      const ticket = await TicketService.createTicket(req.user, req.body);
      res.json({
        success: true,
        message: `Tiket #${ticket.ticketNumber} berhasil diajukan`,
        data: ticket,
      });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      console.error('[Create Ticket Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getTicketDetail(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const ticket = await TicketService.getTicketDetail(id, req.user);
      res.json({ success: true, data: ticket });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      console.error('[Get Ticket Detail Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async replyTicket(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { message } = req.body;
      const result = await TicketService.replyTicket(id, req.user, message);
      res.json({
        success: true,
        message: 'Pesan berhasil dikirim',
        data: result,
      });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      console.error('[Reply Ticket Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateStatus(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const updated = await TicketService.updateTicketStatus(id, req.user, status);
      res.json({
        success: true,
        message: `Status tiket berhasil diubah menjadi ${status}`,
        data: updated,
      });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      console.error('[Update Ticket Status Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
