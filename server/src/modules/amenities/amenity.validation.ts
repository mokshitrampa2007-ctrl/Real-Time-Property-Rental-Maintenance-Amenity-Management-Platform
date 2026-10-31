import { z } from 'zod';

export const operatingHourSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  openingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm format (e.g. 08:00)'),
  closingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm format (e.g. 22:00)'),
});

export const createAmenitySchema = z.object({
  propertyId: z.string().uuid().or(z.string().min(1)),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().optional(),
  location: z.string().optional(),
  capacity: z.number().int().positive().default(10),
  active: z.boolean().default(true),
  approvalRequired: z.boolean().default(false),
  slotDurationMinutes: z.number().int().positive().default(60),
  minimumBookingMinutes: z.number().int().positive().default(30),
  maximumBookingMinutes: z.number().int().positive().default(180),
  advanceBookingDays: z.number().int().positive().default(14),
  cancellationCutoffMinutes: z.number().int().nonnegative().default(60),
  checkInGraceMinutes: z.number().int().positive().default(15),
  operatingHours: z.array(operatingHourSchema).optional(),
});

export const updateAmenitySchema = createAmenitySchema.partial().omit({ propertyId: true });

export const createClosureSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().min(3, 'Closure reason is required'),
});
