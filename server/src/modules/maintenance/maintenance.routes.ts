import { Router } from 'express';
import multer from 'multer';
import { MaintenanceController } from './maintenance.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { updateMaintenanceStatusSchema, assignStaffSchema, createCommentSchema } from './maintenance.validation.js';
import { Role } from '@prisma/client';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

const router = Router();

// List requests (Role-filtered)
router.get('/', authenticate, MaintenanceController.getRequests);

// Request details
router.get('/:id', authenticate, MaintenanceController.getRequestById);

// Tenant create request
router.post(
  '/',
  authenticate,
  requireRole(Role.TENANT),
  upload.array('attachments', 4),
  MaintenanceController.createRequest
);

// Update status (Owner or assigned Staff)
router.patch(
  '/:id/status',
  authenticate,
  requireRole(Role.OWNER, Role.STAFF),
  validateBody(updateMaintenanceStatusSchema),
  MaintenanceController.updateStatus
);

// Assign staff (Owner only)
router.patch(
  '/:id/assign',
  authenticate,
  requireRole(Role.OWNER),
  validateBody(assignStaffSchema),
  MaintenanceController.assignStaff
);

// Add comment (Owner, Tenant, or assigned Staff)
router.post(
  '/:id/comments',
  authenticate,
  validateBody(createCommentSchema),
  MaintenanceController.addComment
);

// Secure attachment access
router.get('/attachments/:storageKey', authenticate, MaintenanceController.getAttachmentFile);

export default router;
