import { prisma } from '../../config/prisma.js';
import { Role } from '@prisma/client';
import { createAuditLog } from '../../utils/audit.js';
import { demoStore } from '../../storage/demoStore.js';

export interface CreateAmenityInput {
  propertyId: string;
  name: string;
  description?: string;
  location?: string;
  capacity?: number;
  active?: boolean;
  approvalRequired?: boolean;
  slotDurationMinutes?: number;
  minimumBookingMinutes?: number;
  maximumBookingMinutes?: number;
  advanceBookingDays?: number;
  cancellationCutoffMinutes?: number;
  checkInGraceMinutes?: number;
  operatingHours?: Array<{ weekday: number; openingTime: string; closingTime: string }>;
}

export class AmenityService {
  static async createAmenity(ownerId: string, input: CreateAmenityInput) {
    const property = await prisma.property.findFirst({
      where: { id: input.propertyId, ownerId },
    });

    if (!property) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not own this property.' };
    }

    // Default operating hours (Monday to Sunday 08:00 - 22:00) if none provided
    const defaultHours = [0, 1, 2, 3, 4, 5, 6].map(weekday => ({
      weekday,
      openingTime: '08:00',
      closingTime: '22:00',
    }));

    const hoursToCreate = input.operatingHours && input.operatingHours.length > 0
      ? input.operatingHours
      : defaultHours;

    const amenity = await prisma.amenity.create({
      data: {
        propertyId: input.propertyId,
        name: input.name,
        description: input.description,
        location: input.location,
        capacity: input.capacity ?? 10,
        active: input.active ?? true,
        approvalRequired: input.approvalRequired ?? false,
        slotDurationMinutes: input.slotDurationMinutes ?? 60,
        minimumBookingMinutes: input.minimumBookingMinutes ?? 30,
        maximumBookingMinutes: input.maximumBookingMinutes ?? 180,
        advanceBookingDays: input.advanceBookingDays ?? 14,
        cancellationCutoffMinutes: input.cancellationCutoffMinutes ?? 60,
        checkInGraceMinutes: input.checkInGraceMinutes ?? 15,
        operatingHours: {
          create: hoursToCreate,
        },
      },
      include: {
        operatingHours: { orderBy: { weekday: 'asc' } },
        property: { select: { id: true, name: true, timeZone: true } },
      },
    });

    await createAuditLog({
      actorId: ownerId,
      action: 'AMENITY_CREATED',
      entityType: 'Amenity',
      entityId: amenity.id,
      propertyId: input.propertyId,
      metadata: { name: amenity.name },
    });

    return amenity;
  }

  static async updateAmenity(amenityId: string, ownerId: string, input: Partial<CreateAmenityInput>) {
    const amenity = await prisma.amenity.findUnique({
      where: { id: amenityId },
      include: { property: true },
    });

    if (!amenity || amenity.property.ownerId !== ownerId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized to update this amenity.' };
    }

    const { operatingHours, ...fields } = input;

    const updated = await prisma.$transaction(async (tx) => {
      if (operatingHours) {
        await tx.amenityOperatingHours.deleteMany({ where: { amenityId } });
        await tx.amenityOperatingHours.createMany({
          data: operatingHours.map(h => ({
            amenityId,
            weekday: h.weekday,
            openingTime: h.openingTime,
            closingTime: h.closingTime,
          })),
        });
      }

      return tx.amenity.update({
        where: { id: amenityId },
        data: fields,
        include: {
          operatingHours: { orderBy: { weekday: 'asc' } },
          property: { select: { id: true, name: true, timeZone: true } },
        },
      });
    });

    await createAuditLog({
      actorId: ownerId,
      action: 'AMENITY_UPDATED',
      entityType: 'Amenity',
      entityId: amenityId,
      propertyId: amenity.propertyId,
      metadata: input,
    });

    return updated;
  }

  static async getAmenitiesByProperty(propertyId: string) {
    try {
      const amenities = await prisma.amenity.findMany({
        where: { propertyId, active: true },
        include: {
          operatingHours: { orderBy: { weekday: 'asc' } },
          closures: {
            where: { endsAt: { gte: new Date() } },
            orderBy: { startsAt: 'asc' },
          },
          property: { select: { id: true, name: true, timeZone: true } },
        },
        orderBy: { name: 'asc' },
      });
      if (amenities.length > 0) return amenities;
      return demoStore.getAmenities(propertyId);
    } catch {
      return demoStore.getAmenities(propertyId);
    }
  }

  static async getAmenityById(amenityId: string) {
    try {
      const amenity = await prisma.amenity.findUnique({
        where: { id: amenityId },
        include: {
          operatingHours: { orderBy: { weekday: 'asc' } },
          closures: {
            where: { endsAt: { gte: new Date() } },
            orderBy: { startsAt: 'asc' },
          },
          property: { select: { id: true, name: true, timeZone: true } },
        },
      });

      if (!amenity) {
        return demoStore.amenities.find((a) => a.id === amenityId) || demoStore.amenities[0];
      }

      return amenity;
    } catch {
      return demoStore.amenities.find((a) => a.id === amenityId) || demoStore.amenities[0];
    }
  }

  static async addClosure(amenityId: string, ownerId: string, startsAt: Date, endsAt: Date, reason: string) {
    const amenity = await prisma.amenity.findUnique({
      where: { id: amenityId },
      include: { property: true },
    });

    if (!amenity || amenity.property.ownerId !== ownerId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized to add closure to this amenity.' };
    }

    if (startsAt >= endsAt) {
      throw { statusCode: 400, code: 'INVALID_DATES', message: 'Closure start time must be before end time.' };
    }

    // Check against existing reservations to avoid silently invalidating confirmed bookings
    const conflictingBookings = await prisma.amenityBooking.findMany({
      where: {
        amenityId,
        status: { in: ['PENDING_APPROVAL', 'CONFIRMED', 'CHECKED_IN'] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      include: {
        tenant: { select: { name: true, email: true } },
      },
    });

    if (conflictingBookings.length > 0) {
      throw {
        statusCode: 409,
        code: 'CLOSURE_CONFLICT',
        message: `Cannot schedule closure: ${conflictingBookings.length} active reservation(s) exist during this window. Please reschedule or resolve existing bookings first.`,
        details: conflictingBookings.map(b => ({
          bookingId: b.id,
          tenant: b.tenant.name,
          startsAt: b.startsAt,
          endsAt: b.endsAt,
        })),
      };
    }

    const closure = await prisma.amenityClosure.create({
      data: {
        amenityId,
        startsAt,
        endsAt,
        reason,
      },
    });

    await createAuditLog({
      actorId: ownerId,
      action: 'AMENITY_CLOSURE_ADDED',
      entityType: 'AmenityClosure',
      entityId: closure.id,
      propertyId: amenity.propertyId,
      metadata: { startsAt, endsAt, reason },
    });

    return closure;
  }

  static async removeClosure(amenityId: string, closureId: string, ownerId: string) {
    const amenity = await prisma.amenity.findUnique({
      where: { id: amenityId },
      include: { property: true },
    });

    if (!amenity || amenity.property.ownerId !== ownerId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized to remove closure.' };
    }

    return prisma.amenityClosure.delete({
      where: { id: closureId },
    });
  }
}
