import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authRateLimiter } from '../../middleware/rateLimit.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { registerOwnerSchema, registerWithInviteSchema, loginSchema } from './auth.validation.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.post(
  '/register-owner',
  authRateLimiter,
  validateBody(registerOwnerSchema),
  AuthController.registerOwner
);

router.post(
  '/register-with-invite',
  authRateLimiter,
  validateBody(registerWithInviteSchema),
  AuthController.registerWithInvite
);

router.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  AuthController.login
);

router.post('/logout', AuthController.logout);

router.get('/me', authenticate, AuthController.me);

export default router;
