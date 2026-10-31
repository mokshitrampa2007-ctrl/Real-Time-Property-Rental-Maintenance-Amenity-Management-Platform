import { prisma } from '../../config/prisma.js';
import { Role, MaintenanceStatus, MaintenanceCategory, MaintenancePriority } from '@prisma/client';
import { realtime } from '../../realtime/socket.js';
import { createAuditLog } from '../../utils/audit.js';
import { storageService } from '../../storage/index.js';
import { demoStore } from '../../storage/demoStore.js';

export interface CreateMaintenanceInput {
  tenantId: string;
  propertyId: string;
  unitId: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  files?: Express.Multer.File[];
}

export class MaintenanceService {
  static async createRequest(input: CreateMaintenanceInput) {
    try {
    // Verify tenant has active tenancy for this property & unit
    const tenancy = await prisma.tenancy.findFirst({
      where: {
        tenantId: input.tenantId,
        propertyId: input.propertyId,
        unitId: input.unitId,
        status: 'ACTIVE',
      },
    });

    if (!tenancy) {
      throw {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'You can only create maintenance requests for your currently assigned unit.',
      };
    }

    // Save attachments if any
    const attachmentsData = [];
    if (input.files && input.files.length > 0) {
      for (const file of input.files) {
        const result = await storageService.saveFile(file);
        attachmentsData.push({
          storageKey: result.storageKey,
          originalName: result.originalName,
          mimeType: result.mimeType,
          size: result.size,
          uploadedById: input.tenantId,
        });
      }
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        tenantId: input.tenantId,
        propertyId: input.propertyId,
        unitId: input.unitId,
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority,
        status: MaintenanceStatus.PENDING,
        attachments: {
          create: attachmentsData,
        },
        statusHistory: {
          create: {
            previousStatus: MaintenanceStatus.PENDING,
            newStatus: MaintenanceStatus.PENDING,
            changedById: input.tenantId,
            notes: 'Request submitted by tenant',
          },
        },
      },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, name: true, ownerId: true } },
        unit: { select: { id: true, unitNumber: true, floor: true } },
        attachments: true,
        statusHistory: { include: { changedBy: { select: { id: true, name: true, role: true } } } },
      },
    });

    await createAuditLog({
      actorId: input.tenantId,
      action: 'MAINTENANCE_CREATED',
      entityType: 'MaintenanceRequest',
      entityId: request.id,
      propertyId: input.propertyId,
      metadata: { title: request.title, category: request.category, priority: request.priority },
    });

    // Notify owner
    await prisma.notification.create({
      data: {
        userId: request.property.ownerId,
        type: 'MAINTENANCE_NEW',
        title: 'New Maintenance Request',
        message: `Unit ${request.unit.unitNumber}: ${request.title} (${request.priority})`,
        entityType: 'MAINTENANCE',
        entityId: request.id,
      },
    });

    // Broadcast real-time events
    realtime.emitToProperty(request.propertyId, 'maintenance:created', request);
    realtime.emitToUser(request.property.ownerId, 'notification:new', {
      title: 'New Maintenance Request',
      message: `Unit ${request.unit.unitNumber}: ${request.title}`,
    });

    return request;
    } catch (err: any) {
      if (err.statusCode) throw err;
      return demoStore.createMaintenanceRequest(input.tenantId, input);
    }
  }

  static async getRequests(userId: string, role: Role, filters: {
    propertyId?: string;
    status?: MaintenanceStatus;
    category?: MaintenanceCategory;
    priority?: MaintenancePriority;
    search?: string;
  }) {
    try {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.priority) where.priority = filters.priority;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (role === Role.TENANT) {
      where.tenantId = userId;
    } else if (role === Role.OWNER) {
      if (filters.propertyId) {
        // Verify ownership
        const prop = await prisma.property.findFirst({ where: { id: filters.propertyId, ownerId: userId } });
        if (!prop) throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not own this property' };
        where.propertyId = filters.propertyId;
      } else {
        where.property = { ownerId: userId };
      }
    } else if (role === Role.STAFF) {
      where.assignedStaffId = userId;
    }

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true, email: true, phone: true } },
        property: { select: { id: true, name: true, timeZone: true } },
        unit: { select: { id: true, unitNumber: true, floor: true } },
        assignedStaff: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true, attachments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;

    return requests.map(req => {
      const isUnresolved = req.status !== MaintenanceStatus.COMPLETED;
      const ageMs = now.getTime() - req.createdAt.getTime();
      const isOverdue = isUnresolved && ageMs > fortyEightHoursMs;
      return {
        ...req,
        isOverdue,
        hoursElapsed: Math.round(ageMs / (1000 * 60 * 60)),
      };
    });
    } catch (err: any) {
      if (err.statusCode) throw err;
      return demoStore.getMaintenanceRequests(userId, role, filters);
    }
  }

  static async getRequestById(requestId: string, userId: string, role: Role) {
    try {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: {
        tenant: { select: { id: true, name: true, email: true, phone: true } },
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            ownerId: true,
            timeZone: true,
            staffMembers: { include: { staff: { select: { id: true, name: true, email: true } } } },
          },
        },
        unit: { select: { id: true, unitNumber: true, floor: true } },
        assignedStaff: { select: { id: true, name: true, email: true, phone: true } },
        comments: {
          include: { author: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
        statusHistory: {
          include: { changedBy: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!request) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Maintenance request not found.' };
    }

    // Role-based authorization
    if (role === Role.TENANT && request.tenantId !== userId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You can only view your own maintenance requests.' };
    }
    if (role === Role.OWNER && request.property.ownerId !== userId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not own this property.' };
    }
    if (role === Role.STAFF) {
      // Must be assigned or a member of this property staff
      const isStaffMember = request.property.staffMembers.some(sm => sm.staff.id === userId);
      if (!isStaffMember && request.assignedStaffId !== userId) {
        throw { statusCode: 403, code: 'FORBIDDEN', message: 'You are not assigned to this request or property.' };
      }
    }

    const now = new Date();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    const isOverdue = request.status !== MaintenanceStatus.COMPLETED &&
      (now.getTime() - request.createdAt.getTime() > fortyEightHoursMs);

    return {
      ...request,
      isOverdue,
      resolutionHours: request.completedAt
        ? Math.round((request.completedAt.getTime() - request.createdAt.getTime()) / (1000 * 60 * 60))
        : null,
    };
    } catch (err: any) {
      if (err.statusCode) throw err;
      return demoStore.getMaintenanceDetails(requestId);
    }
  }

  static async updateStatus(
    requestId: string,
    newStatus: MaintenanceStatus,
    userId: string,
    userRole: Role,
    notes?: string
  ) {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { property: true },
    });

    if (!request) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Maintenance request not found.' };
    }

    // Phase 1 rule: Completed requests are read-only
    if (request.status === MaintenanceStatus.COMPLETED) {
      throw {
        statusCode: 400,
        code: 'READ_ONLY',
        message: 'Completed maintenance requests are final and read-only.',
      };
    }

    // Role authorization
    if (userRole === Role.OWNER && request.property.ownerId !== userId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized: you do not own this property.' };
    }
    if (userRole === Role.STAFF && request.assignedStaffId !== userId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized: request is not assigned to you.' };
    }
    if (userRole === Role.TENANT) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Tenants cannot update maintenance request status.' };
    }

    // Status transition validation: PENDING -> IN_PROGRESS -> COMPLETED
    if (request.status === MaintenanceStatus.IN_PROGRESS && newStatus === MaintenanceStatus.PENDING) {
      throw {
        statusCode: 400,
        code: 'INVALID_TRANSITION',
        message: 'Cannot revert request from In Progress back to Pending.',
      };
    }

    const previousStatus = request.status;
    const completedAt = newStatus === MaintenanceStatus.COMPLETED ? new Date() : null;

    const updated = await prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        completedAt,
        statusHistory: {
          create: {
            previousStatus,
            newStatus,
            changedById: userId,
            notes: notes || `Status updated from ${previousStatus} to ${newStatus}`,
          },
        },
      },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, name: true, ownerId: true } },
        unit: { select: { id: true, unitNumber: true } },
        assignedStaff: { select: { id: true, name: true, email: true } },
        statusHistory: {
          include: { changedBy: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    await createAuditLog({
      actorId: userId,
      action: 'MAINTENANCE_STATUS_UPDATED',
      entityType: 'MaintenanceRequest',
      entityId: requestId,
      propertyId: request.propertyId,
      metadata: { previousStatus, newStatus, notes },
    });

    // Notify tenant of status change
    await prisma.notification.create({
      data: {
        userId: request.tenantId,
        type: 'MAINTENANCE_STATUS_CHANGED',
        title: `Maintenance Request ${newStatus.replace('_', ' ')}`,
        message: `Your request "${request.title}" is now marked as ${newStatus.replace('_', ' ')}.`,
        entityType: 'MAINTENANCE',
        entityId: requestId,
      },
    });

    // Broadcast real-time events
    realtime.emitToProperty(request.propertyId, 'maintenance:updated', updated);
    realtime.emitToUser(request.tenantId, 'notification:new', {
      title: `Maintenance Request ${newStatus}`,
      message: `Your request "${request.title}" is now ${newStatus}.`,
    });

    return updated;
  }

  static async assignStaff(requestId: string, staffId: string | null, ownerId: string) {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { property: true },
    });

    if (!request || request.property.ownerId !== ownerId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized to assign staff to this request.' };
    }

    if (request.status === MaintenanceStatus.COMPLETED) {
      throw { statusCode: 400, code: 'READ_ONLY', message: 'Cannot reassign completed requests.' };
    }

    if (staffId) {
      // Verify staff is member of property staff
      const membership = await prisma.propertyStaff.findUnique({
        where: { propertyId_staffId: { propertyId: request.propertyId, staffId } },
      });
      if (!membership) {
        throw { statusCode: 400, code: 'INVALID_STAFF', message: 'Staff member is not assigned to this property.' };
      }
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: { assignedStaffId: staffId },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, name: true, ownerId: true } },
        unit: { select: { id: true, unitNumber: true } },
        assignedStaff: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      actorId: ownerId,
      action: 'MAINTENANCE_STAFF_ASSIGNED',
      entityType: 'MaintenanceRequest',
      entityId: requestId,
      propertyId: request.propertyId,
      metadata: { staffId },
    });

    if (staffId) {
      await prisma.notification.create({
        data: {
          userId: staffId,
          type: 'MAINTENANCE_ASSIGNED',
          title: 'New Maintenance Assignment',
          message: `You were assigned to: ${request.title}`,
          entityType: 'MAINTENANCE',
          entityId: requestId,
        },
      });
      realtime.emitToUser(staffId, 'notification:new', {
        title: 'New Maintenance Assignment',
        message: `You were assigned to: ${request.title}`,
      });
    }

    realtime.emitToProperty(request.propertyId, 'maintenance:updated', updated);

    return updated;
  }

  static async addComment(requestId: string, authorId: string, authorRole: Role, message: string) {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { property: { include: { staffMembers: true } } },
    });

    if (!request) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Maintenance request not found.' };
    }

    // Role authorization
    if (authorRole === Role.TENANT && request.tenantId !== authorId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized to comment on this request.' };
    }
    if (authorRole === Role.OWNER && request.property.ownerId !== authorId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized to comment on this property.' };
    }
    if (authorRole === Role.STAFF) {
      const isStaff = request.property.staffMembers.some(sm => sm.staffId === authorId);
      if (!isStaff && request.assignedStaffId !== authorId) {
        throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized: not assigned to this property.' };
      }
    }

    const comment = await prisma.maintenanceComment.create({
      data: {
        requestId,
        authorId,
        message,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    // Notify appropriate participants
    const recipients: string[] = [];
    if (authorId !== request.tenantId) recipients.push(request.tenantId);
    if (authorId !== request.property.ownerId) recipients.push(request.property.ownerId);
    if (request.assignedStaffId && authorId !== request.assignedStaffId) {
      recipients.push(request.assignedStaffId);
    }

    for (const recipientId of recipients) {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'MAINTENANCE_COMMENT',
          title: `New comment on: ${request.title}`,
          message: `${comment.author.name}: ${message.substring(0, 80)}...`,
          entityType: 'MAINTENANCE',
          entityId: requestId,
        },
      });
      realtime.emitToUser(recipientId, 'notification:new', {
        title: `New comment on: ${request.title}`,
        message: `${comment.author.name}: ${message.substring(0, 80)}...`,
      });
    }

    realtime.emitToProperty(request.propertyId, 'maintenance:comment', {
      requestId,
      comment,
    });

    return comment;
  }
}
