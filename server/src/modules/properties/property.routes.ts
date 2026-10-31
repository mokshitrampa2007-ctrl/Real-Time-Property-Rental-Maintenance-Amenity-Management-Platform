import { Router } from 'express';
import { PropertyController } from './property.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Tenant property info
router.get('/my-tenancy', authenticate, requireRole(Role.TENANT), PropertyController.getTenantProperty);

// Owner property endpoints
router.post('/', authenticate, requireRole(Role.OWNER), PropertyController.createProperty);
router.get('/', authenticate, requireRole(Role.OWNER), PropertyController.getOwnerProperties);
router.get('/:id', authenticate, PropertyController.getPropertyDetails);

// Unit management (Owner only)
router.post('/:id/units', authenticate, requireRole(Role.OWNER), PropertyController.createUnit);

// Tenancy assignment (Owner only)
router.post('/:id/tenancies', authenticate, requireRole(Role.OWNER), PropertyController.assignTenancy);
router.delete('/:id/tenancies/:tenancyId', authenticate, requireRole(Role.OWNER), PropertyController.endTenancy);

// Staff management (Owner only)
router.post('/:id/staff', authenticate, requireRole(Role.OWNER), PropertyController.addStaffMember);
router.delete('/:id/staff/:staffId', authenticate, requireRole(Role.OWNER), PropertyController.removeStaffMember);

export default router;
