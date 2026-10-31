import { Response, NextFunction } from 'express';
import { PropertyService } from './property.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

export class PropertyController {
  static async createProperty(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const property = await PropertyService.createProperty(req.user!.id, req.body);
      res.status(201).json({ success: true, data: { property } });
    } catch (err) {
      next(err);
    }
  }

  static async getOwnerProperties(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const properties = await PropertyService.getOwnerProperties(req.user!.id);
      res.status(200).json({ success: true, data: { properties } });
    } catch (err) {
      next(err);
    }
  }

  static async getPropertyDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const property = await PropertyService.getPropertyDetails(id, req.user!.id, req.user!.role);
      res.status(200).json({ success: true, data: { property } });
    } catch (err) {
      next(err);
    }
  }

  static async createUnit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: propertyId } = req.params;
      const unit = await PropertyService.createUnit(req.user!.id, {
        propertyId,
        unitNumber: req.body.unitNumber,
        floor: req.body.floor,
        description: req.body.description,
      });
      res.status(201).json({ success: true, data: { unit } });
    } catch (err) {
      next(err);
    }
  }

  static async assignTenancy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: propertyId } = req.params;
      const tenancy = await PropertyService.assignTenancy(req.user!.id, {
        propertyId,
        unitId: req.body.unitId,
        tenantEmail: req.body.tenantEmail,
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });
      res.status(201).json({ success: true, data: { tenancy } });
    } catch (err) {
      next(err);
    }
  }

  static async endTenancy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenancyId } = req.params;
      const tenancy = await PropertyService.endTenancy(req.user!.id, tenancyId);
      res.status(200).json({ success: true, data: { tenancy } });
    } catch (err) {
      next(err);
    }
  }

  static async addStaffMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: propertyId } = req.params;
      const staffMember = await PropertyService.addStaffMember(
        req.user!.id,
        propertyId,
        req.body.staffEmail,
        req.body.roleTitle
      );
      res.status(201).json({ success: true, data: { staffMember } });
    } catch (err) {
      next(err);
    }
  }

  static async removeStaffMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: propertyId, staffId } = req.params;
      await PropertyService.removeStaffMember(req.user!.id, propertyId, staffId);
      res.status(200).json({ success: true, message: 'Staff member removed from property.' });
    } catch (err) {
      next(err);
    }
  }

  static async getTenantProperty(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenancy = await PropertyService.getTenantPropertyInfo(req.user!.id);
      res.status(200).json({ success: true, data: { tenancy } });
    } catch (err) {
      next(err);
    }
  }
}
