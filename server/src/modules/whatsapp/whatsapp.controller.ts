import { Request, Response } from 'express';
import { whatsappService } from './whatsapp.service';

export class WhatsAppController {
  public static getStatus(req: Request, res: Response) {
    const userId = req.user.id;
    const status = whatsappService.getStatus(userId);
    res.json({ success: true, data: status });
  }

  public static async init(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      whatsappService.initialize(userId); // Async in background
      res.json({ success: true, message: 'Inisialisasi WhatsApp dimulai' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async restart(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      whatsappService.restart(userId);
      res.json({ success: true, message: 'Sesi WhatsApp sedang direstart' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async logout(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      await whatsappService.logout(userId);
      res.json({ success: true, message: 'Sesi WhatsApp berhasil logout' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
