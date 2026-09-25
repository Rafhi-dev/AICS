import { Request, Response } from 'express';
import { chatService } from './chat.service';

export class ChatController {
  public static async getConversations(req: Request, res: Response) {
    try {
      const isAudit = req.query.audit === 'true';
      const userId = req.user.id;

      const formatted = await chatService.getConversations(userId, isAudit);
      res.json({ success: true, data: formatted });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getMessages(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user.id;

      const result = await chatService.getConversationMessages(userId, id);
      if (!result) {
        return res.status(404).json({ success: false, error: 'Percakapan tidak ditemukan' });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async sendMessage(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user.id;
      const { text } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({ success: false, error: 'Pesan tidak boleh kosong' });
      }

      const message = await chatService.sendAgentReply(userId, id, text.trim());
      res.json({ success: true, data: message });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async softDelete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user.id;
      const updated = await chatService.softDeleteConversation(userId, id);
      res.json({
        success: true,
        message: 'Percakapan berhasil diarsipkan (soft delete)',
        data: updated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async restore(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user.id;
      const updated = await chatService.restoreConversation(userId, id);
      res.json({
        success: true,
        message: 'Percakapan berhasil dipulihkan',
        data: updated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async toggleAi(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user.id;
      const { isAiActive } = req.body;

      const contact = await chatService.toggleContactAi(userId, id, isAiActive);
      res.json({ success: true, data: contact });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
