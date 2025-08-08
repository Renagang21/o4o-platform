import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from '../services/AuthService';
import { UserRole } from '../types/auth';
import type { AuthRequest } from '../types/auth';

export type { AuthRequest };

/**
 * Middleware to authenticate requests using httpOnly cookies
 */
export const authenticateCookie = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accessToken = req.cookies.accessToken;
    
    if (!accessToken) {
      res.status(401).json({
        error: 'Access token not provided',
        code: 'NO_ACCESS_TOKEN'
      });
      return;
    }

    const payload = authService.verifyAccessToken(accessToken);
    
    if (!payload) {
      // Try to refresh the token
      const refreshToken = req.cookies.refreshToken;
      
      if (refreshToken) {
        const { userAgent, ipAddress } = authService.getRequestMetadata(req);
        const tokens = await authService.rotateRefreshToken(refreshToken, userAgent, ipAddress);
        
        if (tokens) {
          // Set new cookies
          authService.setAuthCookies(res, tokens);
          
          // Verify new access token
          const newPayload = authService.verifyAccessToken(tokens.accessToken);
          if (newPayload) {
            req.user = {
              userId: newPayload.userId || newPayload.sub || '',
              email: newPayload.email || '',
              role: String(newPayload.role || UserRole.CUSTOMER)
            };
            next();
            return;
          }
        }
      }
      
      authService.clearAuthCookies(res);
      res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    req.user = {
      userId: payload.userId || payload.sub || '',
      email: payload.email || '',
      role: String(payload.role || UserRole.CUSTOMER)
    };
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    authService.clearAuthCookies(res);
    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * Middleware for role-based access control
 */
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes((req.user as any).role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles,
        userRole: (req.user as any).role
      });
    }

    next();
  };
};

/**
 * Middleware for optional authentication
 * Adds user to request if valid token exists, but doesn't fail if not
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accessToken = req.cookies.accessToken;
    
    if (accessToken) {
      const payload = authService.verifyAccessToken(accessToken);
      if (payload) {
        req.user = {
          userId: payload.userId || payload.sub || '',
          email: payload.email || '',
          role: String(payload.role || UserRole.CUSTOMER)
        };
      }
    }
    
    next();
  } catch (error: any) {
    // Ignore errors in optional auth
    next();
  }
};