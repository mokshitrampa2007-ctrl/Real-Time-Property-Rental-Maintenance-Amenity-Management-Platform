import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { realtime } from '../realtime/socket.js';
import { createAuditLog } from '../utils/audit.js';

export async function runBookingCleanup(): Promise<{ noShowsProcessed: number; overdueCheckoutsCount: number }> {
  const now = new Date();
  let noShowsProcessed = 0;
  let overdueCheckoutsCount = 0;

  try {
    // 1. Process NO_SHOW bookings:
    // Confirmed bookings where startsAt + amenity.checkInGraceMinutes < now
    const confirmedBookings = await prisma.amenityBooking.findMany({
      where: {
        status: 'CONFIRMED',
        actualCheckInAt: null,
      },
      include: {
        amenity: true,
        tenant: { select: { id: true, name: true, email: true } },
      },
    });

    for (const booking of confirmedBookings) {
      const gracePeriodMs = (booking.amenity.checkInGraceMinutes || 15) * 60 * 1000;
      const cutoffTime = new Date(booking.startsAt.getTime() + gracePeriodMs);

      if (now > cutoffTime) {
        await prisma.amenityBooking.update({
          where: { id: booking.id },
          data: { status: 'NO_SHOW' },
        });

        noShowsProcessed++;

        // Notify tenant
        await prisma.notification.create({
          data: {
            userId: booking.tenantId,
            type: 'BOOKING_NO_SHOW',
            title: 'Booking Marked as No-Show',
            message: `Your booking for ${booking.amenity.name} was marked as No-Show because check-in was not completed within the ${booking.amenity.checkInGraceMinutes}-minute grace window.`,
            entityType: 'BOOKING',
            entityId: booking.id,
          },
        });

        // Audit log
        await createAuditLog({
          actorId: null,
          action: 'BOOKING_AUTO_NO_SHOW',
          entityType: 'AmenityBooking',
          entityId: booking.id,
          propertyId: booking.propertyId,
          metadata: { amenityId: booking.amenityId, startsAt: booking.startsAt },
        });

        // Realtime notification
        realtime.emitToUser(booking.tenantId, 'notification:new', {
          title: 'Booking Marked as No-Show',
          message: `Your reservation for ${booking.amenity.name} was marked as No-Show.`,
        });

        realtime.emitToProperty(booking.propertyId, 'booking:status_changed', {
          bookingId: booking.id,
          status: 'NO_SHOW',
          amenityId: booking.amenityId,
        });
      }
    }

    // 2. Count overdue checkouts (status CHECKED_IN, now > endsAt, actualCheckOutAt is null)
    const overdueCheckouts = await prisma.amenityBooking.findMany({
      where: {
        status: 'CHECKED_IN',
        endsAt: { lt: now },
        actualCheckOutAt: null,
      },
      include: {
        amenity: true,
        property: { select: { ownerId: true } },
      },
    });

    overdueCheckoutsCount = overdueCheckouts.length;

    if (noShowsProcessed > 0 || overdueCheckoutsCount > 0) {
      logger.info(
        `Booking cleanup run completed: ${noShowsProcessed} no-shows updated, ${overdueCheckoutsCount} overdue check-outs identified.`
      );
    }
  } catch (err) {
    logger.error('Error running booking cleanup job:', err);
  }

  return { noShowsProcessed, overdueCheckoutsCount };
}

// Scheduled job runner (runs every 60 seconds)
let cleanupInterval: NodeJS.Timeout | null = null;

export function startBookingCleanupScheduler(intervalMs = 60000) {
  if (cleanupInterval) return;
  // Run once immediately
  runBookingCleanup().catch(err => logger.error('Initial booking cleanup error:', err));
  // Then periodically
  cleanupInterval = setInterval(() => {
    runBookingCleanup().catch(err => logger.error('Periodic booking cleanup error:', err));
  }, intervalMs);
  logger.info(`Booking cleanup scheduler started with ${intervalMs / 1000}s interval.`);
}

export function stopBookingCleanupScheduler() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('Booking cleanup scheduler stopped.');
  }
}
