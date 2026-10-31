import crypto from 'crypto';
import { prisma } from '../../config/prisma.js';
import { Role } from '@prisma/client';
import { createAuditLog } from '../../utils/audit.js';

export interface CreateInviteInput {
  propertyId: string;
  role: Role;
  unitId?: string;
  expiresDays?: number;
  creatorId: string;
}

export class InvitationService {
  static async createInvitation(input: CreateInviteInput) {
    // Verify owner owns property
    const property = await prisma.property.findFirst({
      where: { id: input.propertyId, ownerId: input.creatorId },
    });

    if (!property) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not own this property.' };
    }

    if (input.role === Role.TENANT && input.unitId) {
      const unit = await prisma.unit.findFirst({
        where: { id: input.unitId, propertyId: input.propertyId },
      });
      if (!unit) {
        throw { statusCode: 400, code: 'INVALID_UNIT', message: 'The specified unit does not belong to this property.' };
      }
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresDays = input.expiresDays || 7;
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);

    const invite = await prisma.invitation.create({
      data: {
        tokenHash,
        propertyId: input.propertyId,
        unitId: input.unitId || null,
        role: input.role,
        expiresAt,
        createdById: input.creatorId,
      },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true } },
      },
    });

    await createAuditLog({
      actorId: input.creatorId,
      action: 'INVITATION_CREATED',
      entityType: 'Invitation',
      entityId: invite.id,
      propertyId: input.propertyId,
      metadata: { role: input.role, unitId: input.unitId },
    });

    return {
      id: invite.id,
      token: rawToken,
      invitationUrl: `/invite/${rawToken}`,
      role: invite.role,
      property: invite.property,
      unit: invite.unit,
      expiresAt: invite.expiresAt,
    };
  }

  static async validateToken(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const invite = await prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        property: { select: { id: true, name: true, address: true, timeZone: true } },
        unit: { select: { id: true, unitNumber: true, floor: true } },
      },
    });

    if (!invite) {
      return { valid: false, reason: 'Invitation not found.' };
    }

    if (invite.acceptedAt) {
      return { valid: false, reason: 'This invitation has already been accepted.' };
    }

    if (new Date() > invite.expiresAt) {
      return { valid: false, reason: 'This invitation link has expired.' };
    }

    return {
      valid: true,
      role: invite.role,
      property: invite.property,
      unit: invite.unit,
      expiresAt: invite.expiresAt,
    };
  }

  static async getPropertyInvitations(propertyId: string, ownerId: string) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, ownerId },
    });

    if (!property) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not own this property.' };
    }

    return prisma.invitation.findMany({
      where: { propertyId },
      include: {
        unit: { select: { id: true, unitNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
