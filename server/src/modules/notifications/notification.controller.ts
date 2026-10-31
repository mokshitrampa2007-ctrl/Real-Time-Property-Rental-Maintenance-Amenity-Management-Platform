import { Response, NextFunction } from 'express';
import { NotificationService } from './notification.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

export class NotificationController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await NotificationService.getUserNotifications(req.user!.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await NotificationService.markAsRead(id, req.user!.id);
      res.status(200).json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
      next(err);
    }
  }

  static async markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await NotificationService.markAllAsRead(req.user!.id);
      res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
      next(err);
    }
  }
}
