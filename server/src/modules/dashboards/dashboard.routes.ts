import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/owner', authenticate, requireRole(Role.OWNER), DashboardController.getOwnerDashboard);
router.get('/tenant', authenticate, requireRole(Role.TENANT), DashboardController.getTenantDashboard);
router.get('/staff', authenticate, requireRole(Role.STAFF), DashboardController.getStaffDashboard);

export default router;
