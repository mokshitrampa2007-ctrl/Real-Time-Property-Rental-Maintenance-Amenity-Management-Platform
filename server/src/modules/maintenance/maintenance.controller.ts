import { Response, NextFunction } from 'express';
import { MaintenanceService } from './maintenance.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { MaintenanceCategory, MaintenancePriority, MaintenanceStatus, Role } from '@prisma/client';
import { storageService } from '../../storage/index.js';
import fs from 'fs';

export class MaintenanceController {
  static async createRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const request = await MaintenanceService.createRequest({
        tenantId: req.user!.id,
        propertyId: req.body.propertyId,
        unitId: req.body.unitId,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category as MaintenanceCategory,
        priority: (req.body.priority || 'MEDIUM') as MaintenancePriority,
        files,
      });

      res.status(201).json({ success: true, data: { request } });
    } catch (err) {
      next(err);
    }
  }

  static async getRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { propertyId, status, category, priority, search } = req.query;
      const requests = await MaintenanceService.getRequests(req.user!.id, req.user!.role, {
        propertyId: propertyId as string | undefined,
        status: status as MaintenanceStatus | undefined,
        category: category as MaintenanceCategory | undefined,
        priority: priority as MaintenancePriority | undefined,
        search: search as string | undefined,
      });

      res.status(200).json({ success: true, data: { requests } });
    } catch (err) {
      next(err);
    }
  }

  static async getRequestById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const request = await MaintenanceService.getRequestById(id, req.user!.id, req.user!.role);
      res.status(200).json({ success: true, data: { request } });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const updated = await MaintenanceService.updateStatus(
        id,
        status as MaintenanceStatus,
        req.user!.id,
        req.user!.role,
        notes
      );
      res.status(200).json({ success: true, data: { request: updated } });
    } catch (err) {
      next(err);
    }
  }

  static async assignStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { staffId } = req.body;
      const updated = await MaintenanceService.assignStaff(id, staffId, req.user!.id);
      res.status(200).json({ success: true, data: { request: updated } });
    } catch (err) {
      next(err);
    }
  }

  static async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const comment = await MaintenanceService.addComment(id, req.user!.id, req.user!.role, message);
      res.status(201).json({ success: true, data: { comment } });
    } catch (err) {
      next(err);
    }
  }

  static async getAttachmentFile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { storageKey } = req.params;
      const filePath = storageService.getFilePath(storageKey);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Attachment file not found.' } });
        return;
      }

      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }
}
