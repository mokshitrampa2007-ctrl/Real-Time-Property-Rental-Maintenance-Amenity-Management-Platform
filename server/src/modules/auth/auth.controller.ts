import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { config } from '../../config/index.js';

export class AuthController {
  static async registerOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, token } = await AuthService.registerOwner(req.body);
      res.cookie(config.cookieName, token, AuthService.getCookieOptions());
      res.status(201).json({
        success: true,
        data: { user, token },
      });
    } catch (err) {
      next(err);
    }
  }

  static async registerWithInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, token, property } = await AuthService.registerWithInvite(req.body);
      res.cookie(config.cookieName, token, AuthService.getCookieOptions());
      res.status(201).json({
        success: true,
        data: { user, token, property },
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, token } = await AuthService.login(req.body);
      res.cookie(config.cookieName, token, AuthService.getCookieOptions());
      res.status(200).json({
        success: true,
        data: { user, token },
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie(config.cookieName, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.isProduction ? 'none' : 'lax',
      path: '/',
    });
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } });
        return;
      }
      const user = await AuthService.getCurrentUser(req.user.id);
      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  }
}
