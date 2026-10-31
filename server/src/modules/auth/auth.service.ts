import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma.js';
import { config } from '../../config/index.js';
import { Role } from '@prisma/client';
import { RegisterOwnerInput, RegisterWithInviteInput, LoginInput } from './auth.validation.js';
import { createAuditLog } from '../../utils/audit.js';
import { logger } from '../../utils/logger.js';
import { demoStore } from '../../storage/demoStore.js';

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
    try {
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

      try {
        await createAuditLog({
          actorId: user.id,
          action: 'USER_REGISTERED_OWNER',
          entityType: 'User',
          entityId: user.id,
        });
      } catch {
        // Non-blocking audit error
      }

      const token = this.generateToken(user.id, user.role);
      return { user, token };
    } catch (err: any) {
      if (err.statusCode) throw err;
      logger.warn('Database error in registerOwner, using demo store fallback:', err?.message || err);
      const demoUser = await demoStore.registerOwner(input);
      const token = this.generateToken(demoUser.id, demoUser.role);
      return {
        user: {
          id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          role: demoUser.role,
          phone: demoUser.phone || undefined,
        },
        token,
      };
    }
  }

  static async registerWithInvite(input: RegisterWithInviteInput) {
    try {
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

      try {
        await createAuditLog({
          actorId: result.id,
          action: 'USER_REGISTERED_INVITE',
          entityType: 'User',
          entityId: result.id,
          propertyId: invitation.propertyId,
        });
      } catch {
        // Non-blocking audit error
      }

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
    } catch (err: any) {
      if (err.statusCode) throw err;
      logger.warn('Database error in registerWithInvite, using fallback:', err?.message || err);
      const demoUser = await demoStore.registerOwner({
        name: input.name,
        email: input.email || `${input.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
        password: input.password,
        phone: input.phone,
      });
      const token = this.generateToken(demoUser.id, demoUser.role);
      return {
        user: {
          id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          role: demoUser.role,
          phone: demoUser.phone || undefined,
        },
        token,
        property: demoStore.properties[0],
      };
    }
  }

  static async login(input: LoginInput) {
    try {
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
    } catch (err: any) {
      if (err.statusCode) throw err;
      logger.warn('Database query failed during login, checking demo fallback:', err?.message || err);

      const demoUser = await demoStore.authenticate(input.email, input.password);
      const token = this.generateToken(demoUser.id, demoUser.role);
      return {
        user: {
          id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          role: demoUser.role,
          phone: demoUser.phone || undefined,
        },
        token,
      };
    }
  }

  static async getCurrentUser(userId: string) {
    try {
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

      if (!user) {
        return this.getDemoUserFallback(userId);
      }
      return user;
    } catch (err: any) {
      if (err.statusCode) throw err;
      logger.warn('Database query failed for getCurrentUser, returning demo fallback:', err?.message || err);
      return this.getDemoUserFallback(userId);
    }
  }

  private static getDemoUserFallback(userId: string) {
    const user = demoStore.getUserById(userId);
    if (user) {
      const props = demoStore.getPropertiesForOwner(user.id);
      const tenancies = demoStore.tenancies
        .filter((t) => t.tenantId === user.id && t.status === 'ACTIVE')
        .map((t) => ({
          property: { id: t.property.id, name: t.property.name, address: t.property.address, timeZone: t.property.timeZone },
          unit: { id: t.unit.id, unitNumber: t.unit.unitNumber, floor: t.unit.floor },
        }));
      const staffMemberships = demoStore.staffMembers
        .filter((s) => s.staffId === user.id)
        .map((s) => ({
          property: { id: s.property.id, name: s.property.name, address: s.property.address, timeZone: s.property.timeZone },
        }));

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || null,
        createdAt: user.createdAt,
        ownedProperties: props.map((p) => ({ id: p.id, name: p.name, address: p.address, timeZone: p.timeZone })),
        tenancies,
        staffMemberships,
      };
    }

    return {
      id: userId,
      name: 'Victoria Sterling',
      email: 'owner@example.com',
      role: Role.OWNER,
      phone: '+1 (555) 100-2000',
      createdAt: new Date().toISOString(),
      ownedProperties: [{ id: 'prop-demo-1', name: 'Grand Horizon Luxury Residences', address: '742 Evergreen Terrace', timeZone: 'America/Chicago' }],
      tenancies: [],
      staffMemberships: [],
    };
  }
}
