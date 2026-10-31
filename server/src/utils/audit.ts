import { prisma } from '../config/prisma.js';
import { logger } from './logger.js';

interface AuditLogParams {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  propertyId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        propertyId: params.propertyId || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log', error);
  }
}
