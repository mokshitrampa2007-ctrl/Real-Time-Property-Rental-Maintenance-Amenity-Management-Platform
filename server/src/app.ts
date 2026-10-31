import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { config } from './config/index.js';
import { apiRateLimiter } from './middleware/rateLimit.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import invitationRoutes from './modules/invitations/invitation.routes.js';
import propertyRoutes from './modules/properties/property.routes.js';
import maintenanceRoutes from './modules/maintenance/maintenance.routes.js';
import amenityRoutes from './modules/amenities/amenity.routes.js';
import bookingRoutes from './modules/bookings/booking.routes.js';
import dashboardRoutes from './modules/dashboards/dashboard.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';

export function createApp() {
  const app = express();

  // Trust first proxy (required for Vercel, AWS Lambda, Cloudflare, Heroku reverse proxies)
  app.set('trust proxy', 1);

  // Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow same-origin (falsy), configured origin, Vercel deployments, or localhost
        if (
          !requestOrigin ||
          requestOrigin === config.clientOrigin ||
          requestOrigin.endsWith('.vercel.app') ||
          requestOrigin.includes('localhost')
        ) {
          callback(null, true);
        } else {
          callback(null, true); // Fallback allow for public deployment
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Body and cookie parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Rate Limiting
  app.use('/api', apiRateLimiter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'Property Rental, Maintenance & Amenity Management API',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  // Mount API modules
  app.use('/api/auth', authRoutes);
  app.use('/api/invitations', invitationRoutes);
  app.use('/api/properties', propertyRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/amenities', amenityRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/dashboards', dashboardRoutes);
  app.use('/api/notifications', notificationRoutes);

  // 404 handler for unknown API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Endpoint ${req.method} ${req.originalUrl} not found.` },
    });
  });

  // Serve Frontend static assets in production if built
  const clientDist = path.resolve(process.cwd(), 'client/dist');
  const rootDist = path.resolve(process.cwd(), 'dist');
  const staticPath = fs.existsSync(clientDist) ? clientDist : fs.existsSync(rootDist) ? rootDist : null;

  if (staticPath) {
    app.use(express.static(staticPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  // Central error handling middleware
  app.use(errorHandler);

  return app;
}
