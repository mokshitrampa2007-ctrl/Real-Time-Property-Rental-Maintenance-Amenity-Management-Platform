import { z } from 'zod';

export const createBookingSchema = z.object({
  amenityId: z.string().uuid().or(z.string().min(1)),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  attendeeCount: z.number().int().positive().default(1),
});

export const rejectBookingSchema = z.object({
  reason: z.string().min(2, 'Rejection reason is required'),
});

export const checkInSchema = z.object({});
export const checkOutSchema = z.object({});
