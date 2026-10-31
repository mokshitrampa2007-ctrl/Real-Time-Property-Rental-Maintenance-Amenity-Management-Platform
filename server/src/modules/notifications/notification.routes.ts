import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, NotificationController.list);
router.patch('/:id/read', authenticate, NotificationController.markRead);
router.post('/mark-all-read', authenticate, NotificationController.markAllRead);

export default router;
