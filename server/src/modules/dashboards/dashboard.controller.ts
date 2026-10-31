import { Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

export class DashboardController {
  static async getOwnerDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const propertyId = req.query.propertyId as string | undefined;
      const data = await DashboardService.getOwnerDashboard(req.user!.id, propertyId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getTenantDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await DashboardService.getTenantDashboard(req.user!.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getStaffDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await DashboardService.getStaffDashboard(req.user!.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
