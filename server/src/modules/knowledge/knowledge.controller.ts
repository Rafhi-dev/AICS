import { Request, Response } from 'express';
import { KnowledgeService } from './knowledge.service';

export class KnowledgeController {
  public static async getItems(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'ADMIN';
      const queryUserId = req.query.userId as string | undefined;

      const items = await KnowledgeService.getKnowledgeItems(userId, isAdmin, queryUserId);
      res.json({ success: true, data: items });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createItem(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      const item = await KnowledgeService.createKnowledgeItem(userId, isAdmin, req.body);
      res.json({ success: true, data: item });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateItem(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      const item = await KnowledgeService.updateKnowledgeItem(id, userId, isAdmin, req.body);
      res.json({ success: true, data: item });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteItem(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      await KnowledgeService.deleteKnowledgeItem(id, userId, isAdmin);
      res.json({ success: true, message: 'Item berhasil dihapus' });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
