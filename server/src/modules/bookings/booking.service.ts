import { prisma } from '../../config/prisma.js';
import { BookingStatus, Role } from '@prisma/client';
import { validateOperatingHours } from '../../utils/timezone.js';
import { realtime } from '../../realtime/socket.js';
import { createAuditLog } from '../../utils/audit.js';

export interface CreateBookingInput {
  tenantId: string;
  amenityId: string;
  startsAt: Date;
  endsAt: Date;
  attendeeCount: number;
}

export class BookingService {
  static async createBooking(input: CreateBookingInput) {
    const now = new Date();

    // 1. Half-open interval validation: startsAt < endsAt
    if (input.startsAt >= input.endsAt) {
      throw { statusCode: 400, code: 'INVALID_TIME_RANGE', message: 'Booking start time must be before end time.' };
    }

    // 2. No booking in the past
    if (input.startsAt < now) {
      throw { statusCode: 400, code: 'PAST_BOOKING', message: 'Cannot book a time slot in the past.' };
    }

    // 3. Fetch amenity with property and operating hours
    const amenity = await prisma.amenity.findUnique({
      where: { id: input.amenityId },
      include: {
        property: true,
        operatingHours: true,
        closures: {
          where: { endsAt: { gte: now } },
        },
      },
    });

    if (!amenity || !amenity.active) {
      throw { statusCode: 404, code: 'AMENITY_NOT_AVAILABLE', message: 'Amenity is not available or inactive.' };
    }

    // 4. Verify tenant has active tenancy at this property
    const activeTenancy = await prisma.tenancy.findFirst({
      where: {
        tenantId: input.tenantId,
        propertyId: amenity.propertyId,
        status: 'ACTIVE',
      },
    });

    if (!activeTenancy) {
      throw {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Only registered tenants with an active lease at this property can book amenities.',
      };
    }

    // 5. Check attendee count <= capacity
    if (input.attendeeCount > amenity.capacity) {
      throw {
        statusCode: 400,
        code: 'CAPACITY_EXCEEDED',
        message: `Attendee count (${input.attendeeCount}) exceeds amenity capacity (${amenity.capacity}).`,
      };
    }

    // 6. Check duration limits
    const durationMinutes = Math.round((input.endsAt.getTime() - input.startsAt.getTime()) / (1000 * 60));
    if (durationMinutes < amenity.minimumBookingMinutes) {
      throw {
        statusCode: 400,
        code: 'DURATION_TOO_SHORT',
        message: `Booking duration (${durationMinutes} min) is less than the minimum required (${amenity.minimumBookingMinutes} min).`,
      };
    }
    if (durationMinutes > amenity.maximumBookingMinutes) {
      throw {
        statusCode: 400,
        code: 'DURATION_TOO_LONG',
        message: `Booking duration (${durationMinutes} min) exceeds maximum permitted (${amenity.maximumBookingMinutes} min).`,
      };
    }

    // 7. Check advance booking days
    const maxAdvanceMs = amenity.advanceBookingDays * 24 * 60 * 60 * 1000;
    if (input.startsAt.getTime() - now.getTime() > maxAdvanceMs) {
      throw {
        statusCode: 400,
        code: 'ADVANCE_LIMIT_EXCEEDED',
        message: `Cannot book more than ${amenity.advanceBookingDays} days in advance.`,
      };
    }

    // 8. Validate operating hours in property timezone
    const hoursValidation = validateOperatingHours(
      input.startsAt,
      input.endsAt,
      amenity.property.timeZone,
      amenity.operatingHours
    );

    if (!hoursValidation.valid) {
      throw { statusCode: 400, code: 'OUTSIDE_OPERATING_HOURS', message: hoursValidation.reason };
    }

    // 9. Check against scheduled closures
    const closureConflict = amenity.closures.find(
      c => input.startsAt < c.endsAt && input.endsAt > c.startsAt
    );
    if (closureConflict) {
      throw {
        statusCode: 409,
        code: 'AMENITY_CLOSED',
        message: `The amenity is closed during this window: ${closureConflict.reason}.`,
      };
    }

    // 10. Initial status based on approval requirement
    const initialStatus = amenity.approvalRequired
      ? BookingStatus.PENDING_APPROVAL
      : BookingStatus.CONFIRMED;

    // 11. Insert booking.
    // The PostgreSQL exclusion constraint 'no_overlapping_bookings' guarantees
    // concurrency-safe atomic conflict prevention at the database level!
    const booking = await prisma.amenityBooking.create({
      data: {
        amenityId: input.amenityId,
        tenantId: input.tenantId,
        propertyId: amenity.propertyId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        attendeeCount: input.attendeeCount,
        status: initialStatus,
      },
      include: {
        amenity: { select: { id: true, name: true, location: true } },
        tenant: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, name: true, timeZone: true, ownerId: true } },
      },
    });

    await createAuditLog({
      actorId: input.tenantId,
      action: 'BOOKING_CREATED',
      entityType: 'AmenityBooking',
      entityId: booking.id,
      propertyId: amenity.propertyId,
      metadata: {
        amenityId: input.amenityId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status: initialStatus,
      },
    });

    // Notify owner if approval required
    if (amenity.approvalRequired) {
      await prisma.notification.create({
        data: {
          userId: amenity.property.ownerId,
          type: 'BOOKING_APPROVAL_REQUESTED',
          title: 'Booking Approval Required',
          message: `${booking.tenant.name} requested to book ${booking.amenity.name} for ${booking.startsAt.toISOString()}`,
          entityType: 'BOOKING',
          entityId: booking.id,
        },
      });
      realtime.emitToUser(amenity.property.ownerId, 'notification:new', {
        title: 'Booking Approval Required',
        message: `${booking.tenant.name} requested to book ${booking.amenity.name}.`,
      });
    }

    // Broadcast real-time booking event to property room
    realtime.emitToProperty(amenity.propertyId, 'booking:created', {
      id: booking.id,
      amenityId: booking.amenityId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      status: booking.status,
    });

    return booking;
  }

  static async approveBooking(bookingId: string, ownerId: string) {
    const booking = await prisma.amenityBooking.findUnique({
      where: { id: bookingId },
      include: { property: true, amenity: true },
    });

    if (!booking || booking.property.ownerId !== ownerId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized to approve this booking.' };
    }

    if (booking.status !== BookingStatus.PENDING_APPROVAL) {
      throw {
        statusCode: 400,
        code: 'INVALID_STATUS',
        message: `Booking cannot be approved from current status: ${booking.status}.`,
      };
    }

    const updated = await prisma.amenityBooking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
      include: {
        amenity: true,
        tenant: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      actorId: ownerId,
      action: 'BOOKING_APPROVED',
      entityType: 'AmenityBooking',
      entityId: bookingId,
      propertyId: booking.propertyId,
    });

    // Notify tenant
    await prisma.notification.create({
      data: {
        userId: booking.tenantId,
        type: 'BOOKING_APPROVED',
        title: 'Booking Approved',
        message: `Your booking for ${booking.amenity.name} has been approved!`,
        entityType: 'BOOKING',
        entityId: bookingId,
      },
    });

    realtime.emitToUser(booking.tenantId, 'notification:new', {
      title: 'Booking Approved',
      message: `Your reservation for ${booking.amenity.name} is confirmed!`,
    });

    realtime.emitToProperty(booking.propertyId, 'booking:status_changed', {
      bookingId,
      status: BookingStatus.CONFIRMED,
      amenityId: booking.amenityId,
    });

    return updated;
  }

  static async rejectBooking(bookingId: string, ownerId: string, reason: string) {
    const booking = await prisma.amenityBooking.findUnique({
      where: { id: bookingId },
      include: { property: true, amenity: true },
    });

    if (!booking || booking.property.ownerId !== ownerId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized to reject this booking.' };
    }

    if (booking.status !== BookingStatus.PENDING_APPROVAL) {
      throw {
        statusCode: 400,
        code: 'INVALID_STATUS',
        message: `Booking cannot be rejected from status: ${booking.status}.`,
      };
    }

    // Moving to REJECTED releases the slot!
    const updated = await prisma.amenityBooking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.REJECTED,
        rejectionReason: reason,
      },
      include: {
        amenity: true,
        tenant: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      actorId: ownerId,
      action: 'BOOKING_REJECTED',
      entityType: 'AmenityBooking',
      entityId: bookingId,
      propertyId: booking.propertyId,
      metadata: { reason },
    });

    // Notify tenant
    await prisma.notification.create({
      data: {
        userId: booking.tenantId,
        type: 'BOOKING_REJECTED',
        title: 'Booking Request Rejected',
        message: `Your request for ${booking.amenity.name} was rejected: ${reason}`,
        entityType: 'BOOKING',
        entityId: bookingId,
      },
    });

    realtime.emitToUser(booking.tenantId, 'notification:new', {
      title: 'Booking Request Rejected',
      message: `Your request for ${booking.amenity.name} was rejected: ${reason}`,
    });

    realtime.emitToProperty(booking.propertyId, 'booking:status_changed', {
      bookingId,
      status: BookingStatus.REJECTED,
      amenityId: booking.amenityId,
    });

    return updated;
  }

  static async cancelBooking(bookingId: string, userId: string, role: Role) {
    const booking = await prisma.amenityBooking.findUnique({
      where: { id: bookingId },
      include: { property: true, amenity: true },
    });

    if (!booking) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Booking not found.' };
    }

    const isOwner = role === Role.OWNER && booking.property.ownerId === userId;
    const isTenant = role === Role.TENANT && booking.tenantId === userId;

    if (!isOwner && !isTenant) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized to cancel this booking.' };
    }

    if (!([BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED] as BookingStatus[]).includes(booking.status)) {
      throw {
        statusCode: 400,
        code: 'CANNOT_CANCEL',
        message: `Cannot cancel booking with current status: ${booking.status}.`,
      };
    }

    const now = new Date();

    // Enforce cancellation cutoff for tenants
    if (isTenant && booking.status === BookingStatus.CONFIRMED) {
      const cutoffMs = (booking.amenity.cancellationCutoffMinutes || 60) * 60 * 1000;
      if (now.getTime() > booking.startsAt.getTime() - cutoffMs) {
        throw {
          statusCode: 400,
          code: 'CUTOFF_PASSED',
          message: `Cancellation cutoff passed (${booking.amenity.cancellationCutoffMinutes} minutes before start time).`,
        };
      }
    }

    // Moving to CANCELLED releases the slot!
    const updated = await prisma.amenityBooking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
      include: { amenity: true },
    });

    await createAuditLog({
      actorId: userId,
      action: 'BOOKING_CANCELLED',
      entityType: 'AmenityBooking',
      entityId: bookingId,
      propertyId: booking.propertyId,
    });

    realtime.emitToProperty(booking.propertyId, 'booking:status_changed', {
      bookingId,
      status: BookingStatus.CANCELLED,
      amenityId: booking.amenityId,
    });

    return updated;
  }

  static async checkIn(bookingId: string, tenantId: string) {
    const booking = await prisma.amenityBooking.findUnique({
      where: { id: bookingId },
      include: { amenity: true },
    });

    if (!booking || booking.tenantId !== tenantId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized to check into this booking.' };
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw {
        statusCode: 400,
        code: 'INVALID_STATUS',
        message: `Cannot check in. Booking status is ${booking.status} (must be CONFIRMED).`,
      };
    }

    const now = new Date();
    const graceMs = (booking.amenity.checkInGraceMinutes || 15) * 60 * 1000;
    const windowStart = new Date(booking.startsAt.getTime() - graceMs);
    const windowEnd = new Date(booking.startsAt.getTime() + graceMs);

    if (now < windowStart) {
      throw {
        statusCode: 400,
        code: 'CHECK_IN_TOO_EARLY',
        message: `Check-in opens ${booking.amenity.checkInGraceMinutes} minutes before the scheduled start time.`,
      };
    }

    if (now > windowEnd) {
      throw {
        statusCode: 400,
        code: 'CHECK_IN_EXPIRED',
        message: `Check-in window expired (${booking.amenity.checkInGraceMinutes} minutes grace period passed).`,
      };
    }

    const updated = await prisma.amenityBooking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CHECKED_IN,
        actualCheckInAt: now,
      },
      include: { amenity: true },
    });

    await createAuditLog({
      actorId: tenantId,
      action: 'BOOKING_CHECKED_IN',
      entityType: 'AmenityBooking',
      entityId: bookingId,
      propertyId: booking.propertyId,
      metadata: { actualCheckInAt: now },
    });

    realtime.emitToProperty(booking.propertyId, 'booking:status_changed', {
      bookingId,
      status: BookingStatus.CHECKED_IN,
      amenityId: booking.amenityId,
    });

    return updated;
  }

  static async checkOut(bookingId: string, userId: string, role: Role) {
    const booking = await prisma.amenityBooking.findUnique({
      where: { id: bookingId },
      include: { property: true, amenity: true },
    });

    if (!booking) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Booking not found.' };
    }

    const isOwner = role === Role.OWNER && booking.property.ownerId === userId;
    const isTenant = role === Role.TENANT && booking.tenantId === userId;

    if (!isOwner && !isTenant) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized to check out of this booking.' };
    }

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw {
        statusCode: 400,
        code: 'INVALID_STATUS',
        message: 'Cannot check out: booking has not been checked in.',
      };
    }

    const now = new Date();
    const durationMinutes = booking.actualCheckInAt
      ? Math.round((now.getTime() - booking.actualCheckInAt.getTime()) / (1000 * 60))
      : 0;

    const updated = await prisma.amenityBooking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.COMPLETED,
        actualCheckOutAt: now,
      },
      include: { amenity: true },
    });

    await createAuditLog({
      actorId: userId,
      action: 'BOOKING_CHECKED_OUT',
      entityType: 'AmenityBooking',
      entityId: bookingId,
      propertyId: booking.propertyId,
      metadata: { actualCheckOutAt: now, actualDurationMinutes: durationMinutes },
    });

    realtime.emitToProperty(booking.propertyId, 'booking:status_changed', {
      bookingId,
      status: BookingStatus.COMPLETED,
      amenityId: booking.amenityId,
    });

    return { ...updated, actualDurationMinutes: durationMinutes };
  }

  static async getAmenityAvailability(amenityId: string, startDateStr?: string, endDateStr?: string) {
    const amenity = await prisma.amenity.findUnique({
      where: { id: amenityId },
      include: {
        operatingHours: { orderBy: { weekday: 'asc' } },
        closures: true,
        property: { select: { id: true, name: true, timeZone: true } },
      },
    });

    if (!amenity) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Amenity not found.' };
    }

    const now = new Date();
    const startRange = startDateStr ? new Date(startDateStr) : new Date(now.setHours(0, 0, 0, 0));
    const endRange = endDateStr
      ? new Date(endDateStr)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Fetch active reservations without exposing tenant details
    const activeBookings = await prisma.amenityBooking.findMany({
      where: {
        amenityId,
        status: { in: [BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        startsAt: { lt: endRange },
        endsAt: { gt: startRange },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
      },
      orderBy: { startsAt: 'asc' },
    });

    // Closures
    const activeClosures = await prisma.amenityClosure.findMany({
      where: {
        amenityId,
        startsAt: { lt: endRange },
        endsAt: { gt: startRange },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        reason: true,
      },
      orderBy: { startsAt: 'asc' },
    });

    return {
      amenity: {
        id: amenity.id,
        name: amenity.name,
        capacity: amenity.capacity,
        slotDurationMinutes: amenity.slotDurationMinutes,
        minimumBookingMinutes: amenity.minimumBookingMinutes,
        maximumBookingMinutes: amenity.maximumBookingMinutes,
        checkInGraceMinutes: amenity.checkInGraceMinutes,
        timeZone: amenity.property.timeZone,
        operatingHours: amenity.operatingHours,
      },
      reservedSlots: activeBookings.map(b => ({
        id: b.id,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        status: 'RESERVED',
        bookingState: b.status,
      })),
      closures: activeClosures,
    };
  }

  static async getTenantBookings(tenantId: string) {
    const now = new Date();
    const bookings = await prisma.amenityBooking.findMany({
      where: { tenantId },
      include: {
        amenity: {
          select: {
            id: true,
            name: true,
            location: true,
            checkInGraceMinutes: true,
            cancellationCutoffMinutes: true,
            property: { select: { id: true, name: true, timeZone: true } },
          },
        },
      },
      orderBy: { startsAt: 'desc' },
    });

    return bookings.map(b => {
      const graceMs = (b.amenity.checkInGraceMinutes || 15) * 60 * 1000;
      const canCheckIn =
        b.status === BookingStatus.CONFIRMED &&
        now >= new Date(b.startsAt.getTime() - graceMs) &&
        now <= new Date(b.startsAt.getTime() + graceMs);

      const canCheckOut = b.status === BookingStatus.CHECKED_IN;

      const cutoffMs = (b.amenity.cancellationCutoffMinutes || 60) * 60 * 1000;
      const canCancel =
        (b.status === BookingStatus.PENDING_APPROVAL || b.status === BookingStatus.CONFIRMED) &&
        now.getTime() <= b.startsAt.getTime() - cutoffMs;

      return {
        ...b,
        canCheckIn,
        canCheckOut,
        canCancel,
      };
    });
  }

  static async getPropertyBookings(propertyId: string, ownerId: string) {
    const prop = await prisma.property.findFirst({
      where: { id: propertyId, ownerId },
    });

    if (!prop) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not own this property.' };
    }

    const now = new Date();
    const bookings = await prisma.amenityBooking.findMany({
      where: { propertyId },
      include: {
        amenity: { select: { id: true, name: true, location: true } },
        tenant: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { startsAt: 'desc' },
    });

    return bookings.map(b => {
      const isOverdueCheckOut =
        b.status === BookingStatus.CHECKED_IN &&
        !b.actualCheckOutAt &&
        now > b.endsAt;

      return {
        ...b,
        isOverdueCheckOut,
      };
    });
  }
}
