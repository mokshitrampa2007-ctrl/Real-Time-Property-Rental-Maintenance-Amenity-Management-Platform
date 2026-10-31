import { Router } from 'express';
import { InvitationController } from './invitation.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Public token validation
router.get('/validate', InvitationController.validate);

// Owner routes for creating and listing invitations
router.post('/property/:propertyId', authenticate, requireRole(Role.OWNER), InvitationController.create);
router.get('/property/:propertyId', authenticate, requireRole(Role.OWNER), InvitationController.listByProperty);

export default router;
