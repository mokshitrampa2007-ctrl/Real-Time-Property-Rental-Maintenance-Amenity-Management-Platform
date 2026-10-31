import { Request, Response, NextFunction } from 'express';
import { InvitationService } from './invitation.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

export class InvitationController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { propertyId } = req.params;
      const { role, unitId, expiresDays } = req.body;
      const result = await InvitationService.createInvitation({
        propertyId,
        role,
        unitId,
        expiresDays,
        creatorId: req.user!.id,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async validate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.query.token as string;
      if (!token) {
        res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'Token query parameter required' } });
        return;
      }
      const result = await InvitationService.validateToken(token);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async listByProperty(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { propertyId } = req.params;
      const invitations = await InvitationService.getPropertyInvitations(propertyId, req.user!.id);
      res.status(200).json({ success: true, data: { invitations } });
    } catch (err) {
      next(err);
    }
  }
}
