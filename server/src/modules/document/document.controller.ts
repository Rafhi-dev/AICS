import { Request, Response } from 'express';
import { documentService } from './document.service';

export class DocumentController {
  public static async getAll(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'ADMIN';
      const queryUserId = req.query.userId as string | undefined;

      const docs = await documentService.getDocuments(userId, isAdmin, queryUserId);
      res.json({ success: true, data: docs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async upload(req: Request, res: Response) {
    try {
      let userId = req.user.id;
      if (req.user.role === 'ADMIN' && req.body.userId) {
        userId = String(req.body.userId);
      }

      const file = req.file;
      const { title } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, error: 'Judul dokumen wajib diisi' });
      }

      const doc = await documentService.createDocument(userId, file, req.body);
      res.json({ success: true, data: doc });
    } catch (err: any) {
      console.error('[Document Upload Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      const updated = await documentService.updateDocument(id, userId, isAdmin, req.body);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      if (err.message === 'Dokumen tidak ditemukan') {
        return res.status(404).json({ success: false, error: err.message });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async remove(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      await documentService.deleteDocument(id, userId, isAdmin);
      res.json({ success: true, message: 'Dokumen berhasil dihapus' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async toggle(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'ADMIN';
      const { isActive } = req.body;

      const updated = await documentService.toggleDocument(id, userId, isAdmin, isActive);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      if (err.message === 'Dokumen tidak ditemukan') {
        return res.status(404).json({ success: false, error: err.message });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
