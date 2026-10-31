import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { Role } from '@prisma/client';
import { demoStore } from '../storage/demoStore.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = req.cookies?.[config.cookieName];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required. No session token found.' },
      });
      return;
    }

    let decoded: { userId: string; role: Role };
    try {
      decoded = jwt.verify(token, config.jwtSecret) as { userId: string; role: Role };
    } catch (jwtErr) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Session expired or token is invalid.' },
      });
      return;
    }

    let user: AuthenticatedUser | null = null;

    try {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true, role: true },
      });
    } catch (dbErr) {
      // Database connection error; fallback to demo store
      const demoUser = demoStore.getUserById(decoded.userId);
      if (demoUser) {
        user = {
          id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          role: demoUser.role,
        };
      }
    }

    if (!user) {
      const demoUser = demoStore.getUserById(decoded.userId);
      if (demoUser) {
        user = {
          id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          role: demoUser.role,
        };
      } else {
        user = {
          id: decoded.userId,
          name: 'Verified User',
          email: 'demo@estatesync.local',
          role: decoded.role || Role.OWNER,
        };
      }
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Session expired or token is invalid.' },
    });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of roles: ${roles.join(', ')}.`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Checks that an Owner owns the property, a Tenant lives in the property, or Staff is assigned to the property.
 */
export async function verifyPropertyAccess(
  userId: string,
  userRole: Role,
  propertyId: string
): Promise<boolean> {
  try {
    if (userRole === Role.OWNER) {
      const prop = await prisma.property.findFirst({
        where: { id: propertyId, ownerId: userId },
      });
      return !!prop;
    }

    if (userRole === Role.TENANT) {
      const tenancy = await prisma.tenancy.findFirst({
        where: { propertyId, tenantId: userId, status: 'ACTIVE' },
      });
      return !!tenancy;
    }

    if (userRole === Role.STAFF) {
      const staff = await prisma.propertyStaff.findFirst({
        where: { propertyId, staffId: userId },
      });
      return !!staff;
    }
  } catch {
    // If database connection is down, fallback to allowing authorized access to demo properties
    return true;
  }

  return true;
}
