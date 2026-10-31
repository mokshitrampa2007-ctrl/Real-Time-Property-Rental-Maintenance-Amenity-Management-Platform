import { Router } from 'express';
import { AmenityController } from './amenity.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createAmenitySchema, updateAmenitySchema, createClosureSchema } from './amenity.validation.js';
import { Role } from '@prisma/client';

const router = Router();

// Public / Authenticated list and details
router.get('/property/:propertyId', authenticate, AmenityController.getAmenitiesByProperty);
router.get('/:id', authenticate, AmenityController.getAmenityById);

// Owner operations
router.post(
  '/',
  authenticate,
  requireRole(Role.OWNER),
  validateBody(createAmenitySchema),
  AmenityController.createAmenity
);

router.patch(
  '/:id',
  authenticate,
  requireRole(Role.OWNER),
  validateBody(updateAmenitySchema),
  AmenityController.updateAmenity
);

// Closures
router.post(
  '/:id/closures',
  authenticate,
  requireRole(Role.OWNER),
  validateBody(createClosureSchema),
  AmenityController.addClosure
);

router.delete(
  '/:id/closures/:closureId',
  authenticate,
  requireRole(Role.OWNER),
  AmenityController.removeClosure
);

export default router;
