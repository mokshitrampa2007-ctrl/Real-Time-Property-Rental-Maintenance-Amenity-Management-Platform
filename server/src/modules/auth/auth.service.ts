import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma.js';
import { config } from '../../config/index.js';
import { Role } from '@prisma/client';
import { RegisterOwnerInput, RegisterWithInviteInput, LoginInput } from './auth.validation.js';
import { createAuditLog } from '../../utils/audit.js';

export class AuthService {
  static generateToken(userId: string, role: Role): string {
    return jwt.sign({ userId, role }, config.jwtSecret, { expiresIn: '7d' });
  }

  static getCookieOptions() {
    return {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: (config.isProduction ? 'none' : 'lax') as 'none' | 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    };
  }

  static async registerOwner(input: RegisterOwnerInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw { statusCode: 409, code: 'EMAIL_IN_USE', message: 'An account with this email already exists.' };
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: Role.OWNER,
        phone: input.phone,
      },
      select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
    });

    await createAuditLog({
      actorId: user.id,
      action: 'USER_REGISTERED_OWNER',
      entityType: 'User',
      entityId: user.id,
    });

    const token = this.generateToken(user.id, user.role);
    return { user, token };
  }

  static async registerWithInvite(input: RegisterWithInviteInput) {
    const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');

    const invitation = await prisma.invitation.findUnique({
      where: { tokenHash },
      include: { property: true, unit: true },
    });

    if (!invitation) {
      throw { statusCode: 400, code: 'INVALID_INVITE', message: 'Invitation is invalid or does not exist.' };
    }

    if (invitation.acceptedAt) {
      throw { statusCode: 400, code: 'INVITE_ALREADY_USED', message: 'This invitation has already been accepted.' };
    }

    if (new Date() > invitation.expiresAt) {
      throw { statusCode: 400, code: 'INVITE_EXPIRED', message: 'This invitation link has expired. Please request a new invitation.' };
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const userEmail = input.email || `${input.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@prop.local`;

    const existingEmail = await prisma.user.findUnique({ where: { email: userEmail } });
    if (existingEmail) {
      throw { statusCode: 409, code: 'EMAIL_IN_USE', message: 'An account with this email already exists.' };
    }

    // Atomically create user, link tenancy or staff, and mark invitation accepted
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: userEmail,
          passwordHash,
          role: invitation.role,
          phone: input.phone,
        },
      });

      // Mark invitation accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      if (invitation.role === Role.TENANT && invitation.unitId) {
        await tx.tenancy.create({
          data: {
            tenantId: user.id,
            propertyId: invitation.propertyId,
            unitId: invitation.unitId,
            startDate: new Date(),
            status: 'ACTIVE',
          },
        });
      } else if (invitation.role === Role.STAFF) {
        await tx.propertyStaff.create({
          data: {
            staffId: user.id,
            propertyId: invitation.propertyId,
            roleTitle: 'Maintenance Technician',
          },
        });
      }

      return user;
    });

    await createAuditLog({
      actorId: result.id,
      action: 'USER_REGISTERED_INVITE',
      entityType: 'User',
      entityId: result.id,
      propertyId: invitation.propertyId,
    });

    const token = this.generateToken(result.id, result.role);
    return {
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role,
        phone: result.phone,
      },
      token,
      property: invitation.property,
    };
  }

  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    const token = this.generateToken(user.id, user.role);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      token,
    };
  }

  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
        ownedProperties: {
          select: { id: true, name: true, address: true, timeZone: true },
        },
        tenancies: {
          where: { status: 'ACTIVE' },
          include: {
            property: { select: { id: true, name: true, address: true, timeZone: true } },
            unit: { select: { id: true, unitNumber: true, floor: true } },
          },
        },
        staffMemberships: {
          include: {
            property: { select: { id: true, name: true, address: true, timeZone: true } },
          },
        },
      },
    });

    return user;
  }
}
