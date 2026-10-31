import { Request, Response, NextFunction } from 'express';
import { BookingService } from './booking.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

export class BookingController {
  static async createBooking(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { amenityId, startsAt, endsAt, attendeeCount } = req.body;
      const booking = await BookingService.createBooking({
        tenantId: req.user!.id,
        amenityId,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        attendeeCount: attendeeCount || 1,
      });

      res.status(201).json({ success: true, data: { booking } });
    } catch (err) {
      next(err);
    }
  }

  static async approveBooking(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await BookingService.approveBooking(id, req.user!.id);
      res.status(200).json({ success: true, data: { booking: updated } });
    } catch (err) {
      next(err);
    }
  }

  static async rejectBooking(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const updated = await BookingService.rejectBooking(id, req.user!.id, reason);
      res.status(200).json({ success: true, data: { booking: updated } });
    } catch (err) {
      next(err);
    }
  }

  static async cancelBooking(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await BookingService.cancelBooking(id, req.user!.id, req.user!.role);
      res.status(200).json({ success: true, data: { booking: updated } });
    } catch (err) {
      next(err);
    }
  }

  static async checkIn(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await BookingService.checkIn(id, req.user!.id);
      res.status(200).json({ success: true, data: { booking: updated } });
    } catch (err) {
      next(err);
    }
  }

  static async checkOut(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await BookingService.checkOut(id, req.user!.id, req.user!.role);
      res.status(200).json({ success: true, data: { booking: updated } });
    } catch (err) {
      next(err);
    }
  }

  static async getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { amenityId, startDate, endDate } = req.query;
      if (!amenityId || typeof amenityId !== 'string') {
        res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'amenityId query parameter required' } });
        return;
      }

      const result = await BookingService.getAmenityAvailability(
        amenityId,
        startDate as string | undefined,
        endDate as string | undefined
      );

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getTenantBookings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookings = await BookingService.getTenantBookings(req.user!.id);
      res.status(200).json({ success: true, data: { bookings } });
    } catch (err) {
      next(err);
    }
  }

  static async getPropertyBookings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { propertyId } = req.params;
      const bookings = await BookingService.getPropertyBookings(propertyId, req.user!.id);
      res.status(200).json({ success: true, data: { bookings } });
    } catch (err) {
      next(err);
    }
  }
}
