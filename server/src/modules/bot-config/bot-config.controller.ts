import { Request, Response } from 'express';
import { BotConfigService } from './bot-config.service';

export class BotConfigController {
  public static async getConfig(req: Request, res: Response) {
    try {
      const data = await BotConfigService.getConfig(req.user);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateConfig(req: Request, res: Response) {
    try {
      const updated = await BotConfigService.updateConfig(req.user, req.body);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
