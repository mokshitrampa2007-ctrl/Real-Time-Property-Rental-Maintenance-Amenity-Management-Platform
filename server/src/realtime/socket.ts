import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (key) {
      list[key] = decodeURI(parts.join('='));
    }
  });
  return list;
}
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { verifyPropertyAccess } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: {
      id: string;
      name: string;
      email: string;
      role: Role;
    };
  };
}

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientOrigin,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // Authentication middleware for socket connections
  io.use(async (socket: Socket, next) => {
    try {
      let token: string | undefined;

      // 1. Try handshake cookies
      if (socket.handshake.headers.cookie) {
        const parsedCookies = parseCookies(socket.handshake.headers.cookie);
        token = parsedCookies[config.cookieName];
      }

      // 2. Try handshake auth object or query
      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }
      if (!token && socket.handshake.query?.token) {
        token = socket.handshake.query.token as string;
      }

      if (!token) {
        return next(new Error('Authentication required for socket connection'));
      }

      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; role: Role };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true, role: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.user = user;
      next();
    } catch (err) {
      logger.error('Socket authentication failed:', err);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    // Automatically join personal room
    const userRoom = `user:${user.id}`;
    socket.join(userRoom);
    logger.info(`Socket connected: ${socket.id} (User: ${user.name}, Role: ${user.role})`);

    // Handle joining a property room with server-side authorization check
    socket.on('property:join', async (propertyId: string, callback?: (res: { success: boolean; error?: string }) => void) => {
      try {
        if (!propertyId || typeof propertyId !== 'string') {
          callback?.({ success: false, error: 'Invalid property ID' });
          return;
        }

        const hasAccess = await verifyPropertyAccess(user.id, user.role, propertyId);
        if (!hasAccess) {
          logger.warn(`Unauthorized attempt to join property room ${propertyId} by user ${user.id}`);
          callback?.({ success: false, error: 'Unauthorized to join property room' });
          return;
        }

        socket.join(`property:${propertyId}`);
        logger.info(`User ${user.id} joined property room: property:${propertyId}`);
        callback?.({ success: true });
      } catch (err) {
        logger.error(`Error in property:join for user ${user.id}:`, err);
        callback?.({ success: false, error: 'Failed to join property room' });
      }
    });

    // Leave property room
    socket.on('property:leave', (propertyId: string) => {
      socket.leave(`property:${propertyId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getSocketServer(): Server | null {
  return io;
}

// Helper methods to emit real-time events to authorized recipients
export const realtime = {
  emitToUser(userId: string, event: string, data: any) {
    if (io) {
      io.to(`user:${userId}`).emit(event, data);
    }
  },

  emitToProperty(propertyId: string, event: string, data: any) {
    if (io) {
      io.to(`property:${propertyId}`).emit(event, data);
    }
  },

  emitToRolesInProperty(propertyId: string, roles: Role[], event: string, data: any) {
    // When broadcast is specific to certain roles in a property
    if (io) {
      io.to(`property:${propertyId}`).emit(event, { ...data, targetRoles: roles });
    }
  },
};
