import { Request, Response, NextFunction } from 'express';
import { AmenityService } from './amenity.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

export class AmenityController {
  static async createAmenity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const amenity = await AmenityService.createAmenity(req.user!.id, req.body);
      res.status(201).json({ success: true, data: { amenity } });
    } catch (err) {
      next(err);
    }
  }

  static async updateAmenity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const amenity = await AmenityService.updateAmenity(id, req.user!.id, req.body);
      res.status(200).json({ success: true, data: { amenity } });
    } catch (err) {
      next(err);
    }
  }

  static async getAmenitiesByProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { propertyId } = req.params;
      const amenities = await AmenityService.getAmenitiesByProperty(propertyId);
      res.status(200).json({ success: true, data: { amenities } });
    } catch (err) {
      next(err);
    }
  }

  static async getAmenityById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const amenity = await AmenityService.getAmenityById(id);
      res.status(200).json({ success: true, data: { amenity } });
    } catch (err) {
      next(err);
    }
  }

  static async addClosure(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { startsAt, endsAt, reason } = req.body;
      const closure = await AmenityService.addClosure(
        id,
        req.user!.id,
        new Date(startsAt),
        new Date(endsAt),
        reason
      );
      res.status(201).json({ success: true, data: { closure } });
    } catch (err) {
      next(err);
    }
  }

  static async removeClosure(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, closureId } = req.params;
      await AmenityService.removeClosure(id, closureId, req.user!.id);
      res.status(200).json({ success: true, message: 'Closure removed successfully.' });
    } catch (err) {
      next(err);
    }
  }
}
