import { Request, Response } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
  public static async login(req: Request, res: Response) {
    try {
      const { password } = req.body;
      const identifier = req.body.identifier || req.body.email || req.body.username || '';

      const data = await AuthService.login(identifier, password);
      res.json({ success: true, data });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      console.error('[Auth Login Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async me(req: Request, res: Response) {
    try {
      const data = await AuthService.getProfile(req.user);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const updatedUser = await AuthService.updateProfile(userId, req.body);
      res.json({
        success: true,
        message: 'Profil berhasil diperbarui',
        data: updatedUser,
      });
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      console.error('[Update Profile Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
