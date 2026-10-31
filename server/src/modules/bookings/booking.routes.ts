import { Router } from 'express';
import { BookingController } from './booking.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createBookingSchema, rejectBookingSchema } from './booking.validation.js';
import { Role } from '@prisma/client';

const router = Router();

// Availability query (Authenticated or public with session)
router.get('/availability', authenticate, BookingController.getAvailability);

// Tenant personal bookings
router.get('/my-bookings', authenticate, requireRole(Role.TENANT), BookingController.getTenantBookings);

// Tenant create booking
router.post(
  '/',
  authenticate,
  requireRole(Role.TENANT),
  validateBody(createBookingSchema),
  BookingController.createBooking
);

// Check-in (Tenant)
router.post('/:id/check-in', authenticate, requireRole(Role.TENANT), BookingController.checkIn);

// Check-out (Tenant or Owner)
router.post('/:id/check-out', authenticate, BookingController.checkOut);

// Cancel booking (Tenant or Owner)
router.post('/:id/cancel', authenticate, BookingController.cancelBooking);

// Owner property bookings list
router.get('/property/:propertyId', authenticate, requireRole(Role.OWNER), BookingController.getPropertyBookings);

// Owner approval / rejection
router.post('/:id/approve', authenticate, requireRole(Role.OWNER), BookingController.approveBooking);
router.post(
  '/:id/reject',
  authenticate,
  requireRole(Role.OWNER),
  validateBody(rejectBookingSchema),
  BookingController.rejectBooking
);

export default router;
