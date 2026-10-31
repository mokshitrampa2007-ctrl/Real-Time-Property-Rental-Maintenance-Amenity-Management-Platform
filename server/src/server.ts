import http from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { initSocketServer } from './realtime/socket.js';
import { startBookingCleanupScheduler, stopBookingCleanupScheduler } from './jobs/bookingCleanup.js';
import { disconnectPrisma } from './config/prisma.js';

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize Socket.IO
  initSocketServer(server);

  // Start background cron / interval jobs
  startBookingCleanupScheduler(60000); // Check every 60s

  server.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port} in ${config.nodeEnv} mode`);
    logger.info(`Client origin allowed: ${config.clientOrigin}`);
    logger.info(`REST API base: http://localhost:${config.port}/api`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    stopBookingCleanupScheduler();

    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectPrisma();
      logger.info('Prisma disconnected. Process exiting.');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forceful shutdown timeout reached.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch(err => {
  logger.error('Fatal bootstrap failure:', err);
  process.exit(1);
});
