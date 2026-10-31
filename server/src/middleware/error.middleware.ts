import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error(`Unhandled error on ${req.method} ${req.url}:`, err);

  // PostgreSQL Exclusion Constraint Violation (code 23P01 or constraint name)
  const errMessage = (err?.message || '') + (typeof err === 'object' ? JSON.stringify(err) : '');
  if (
    err?.code === '23P01' ||
    errMessage.includes('23P01') ||
    errMessage.includes('exclusion constraint') ||
    errMessage.includes('no_overlapping_bookings')
  ) {
    res.status(409).json({
      success: false,
      error: {
        code: 'BOOKING_CONFLICT',
        message: 'The requested amenity time slot conflicts with an existing reservation. Please choose a different time.',
      },
    });
    return;
  }

  // Prisma Unique Constraint Violation (code P2002)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? (err.meta?.target as string[]).join(', ') : 'field';
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `A record with this ${target} already exists.`,
      },
    });
    return;
  }

  // Multer File Upload Errors
  if (err?.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'Uploaded file exceeds the maximum allowed size of 5MB.',
      },
    });
    return;
  }

  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const message = err.message || 'An unexpected server error occurred.';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: statusCode === 500 && process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : message,
    },
  });
}
