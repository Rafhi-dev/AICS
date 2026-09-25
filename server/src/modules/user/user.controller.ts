import { Request, Response } from 'express';
import { UserService } from './user.service';

export class UserController {
  public static async getUsers(req: Request, res: Response) {
    try {
      const isAudit = req.query.audit === 'true';
      const users = await UserService.getUsers(isAudit);
      res.json({ success: true, data: users });
    } catch (err: any) {
      console.error('[Get Users Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createUser(req: Request, res: Response) {
    try {
      const user = await UserService.createUser(req.body);
      res.json({ success: true, data: user });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      console.error('[Create User Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateUser(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const updated = await UserService.updateUser(id, req.body);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      console.error('[Update User Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteUser(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const user = await UserService.softDeleteUser(id, req.user.id);
      res.json({
        success: true,
        message: 'Akun user berhasil dinonaktifkan (soft delete)',
        data: user,
      });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async restoreUser(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const user = await UserService.restoreUser(id);
      res.json({
        success: true,
        message: 'Akun user berhasil dipulihkan',
        data: user,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async emergencyTerminate(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const user = await UserService.emergencyTerminate(id);
      res.json({
        success: true,
        message: `Tindakan darurat berhasil: Sesi akun dan koneksi WhatsApp untuk ${user.name} telah diputus secara paksa.`,
      });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      console.error('[Emergency Terminate Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async impersonateUser(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await UserService.impersonateUser(id, req.user.id);
      res.json({
        success: true,
        message: `Berhasil meng-impersonate akun ${result.user.name}`,
        data: result,
      });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      console.error('[Impersonate Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateSubscription(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await UserService.updateSubscription(id, req.body);
      res.json({
        success: true,
        message: 'Masa aktif akun berhasil diperbarui',
        data: result,
      });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      console.error('[Subscription Update Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
