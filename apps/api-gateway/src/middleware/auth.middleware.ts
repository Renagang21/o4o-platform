import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { gatewayConfig } from '../config/gateway.config.js';
import { createLogger } from '../utils/logger.js';
import Redis from 'ioredis';

const logger = createLogger('AuthMiddleware');

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    status: string;
    permissions?: string[];
  };
  session?: {
    id: string;
    userId: string;
  };
}

export class AuthMiddleware {
  private redis: Redis | null;
  private jwtSecret: string;

  constructor(redis?: Redis) {
    this.redis = redis || null;
    this.jwtSecret = gatewayConfig.jwt.secret;
  }

  /**
   * Verify JWT token and attach user to request
   */
  authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check for access token in cookies first
      let token = req.cookies?.accessToken;
      
      // Fallback to Authorization header
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (!token) {
        res.status(401).json({
          error: 'No authentication token provided',
          code: 'NO_TOKEN'
        });
        return;
      }
      
      // Verify JWT token
      try {
        const decoded = jwt.verify(token, this.jwtSecret) as any;
        
        // Check if token is blacklisted (for logout functionality)
        if (this.redis) {
          const isBlacklisted = await this.redis.get(`blacklist:${token}`);
          if (isBlacklisted) {
            res.status(401).json({
              error: 'Token has been revoked',
              code: 'TOKEN_REVOKED'
            });
            return;
          }
        }
        
        // Attach user to request
        req.user = {
          id: decoded.id || decoded.userId,
          email: decoded.email,
          role: decoded.role,
          status: decoded.status,
          permissions: decoded.permissions
        };
        
        // Check session ID if provided
        const sessionId = req.cookies?.sessionId;
        if (sessionId && this.redis) {
          const sessionData = await this.redis.get(`session:${sessionId}`);
          if (sessionData) {
            const session = JSON.parse(sessionData);
            if (session.userId === req.user.id) {
              req.session = {
                id: sessionId,
                userId: session.userId
              };
            }
          }
        }
        
        logger.debug('User authenticated', { 
          userId: req.user.id, 
          role: req.user.role 
        });
        
        next();
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          res.status(401).json({
            error: 'Token has expired',
            code: 'TOKEN_EXPIRED'
          });
          return;
        }
        
        if (error.name === 'JsonWebTokenError') {
          res.status(401).json({
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
          });
          return;
        }
        
        throw error;
      }
    } catch (error) {
      logger.error('Authentication error', error);
      res.status(500).json({
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      });
    }
  };

  /**
   * Check if user has required role
   */
  authorize = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }
      
      if (!roles.includes(req.user.role)) {
        logger.warn('Authorization failed', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: roles
        });
        
        res.status(403).json({
          error: 'Insufficient permissions',
          code: 'FORBIDDEN'
        });
        return;
      }
      
      next();
    };
  };

  /**
   * Check if user has required permission
   */
  requirePermission = (permission: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }
      
      // Admin has all permissions
      if (req.user.role === 'admin') {
        next();
        return;
      }
      
      if (!req.user.permissions?.includes(permission)) {
        logger.warn('Permission check failed', {
          userId: req.user.id,
          permission,
          userPermissions: req.user.permissions
        });
        
        res.status(403).json({
          error: 'Missing required permission',
          code: 'PERMISSION_DENIED',
          permission
        });
        return;
      }
      
      next();
    };
  };

  /**
   * Optional authentication - attach user if token exists but don't fail
   */
  optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check for token
      let token = req.cookies?.accessToken;
      
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (token) {
        try {
          const decoded = jwt.verify(token, this.jwtSecret) as any;
          
          // Check blacklist
          if (this.redis) {
            const isBlacklisted = await this.redis.get(`blacklist:${token}`);
            if (!isBlacklisted) {
              req.user = {
                id: decoded.id || decoded.userId,
                email: decoded.email,
                role: decoded.role,
                status: decoded.status,
                permissions: decoded.permissions
              };
            }
          } else {
            req.user = {
              id: decoded.id || decoded.userId,
              email: decoded.email,
              role: decoded.role,
              status: decoded.status,
              permissions: decoded.permissions
            };
          }
        } catch {
          // Invalid token, but don't fail for optional auth
        }
      }
      
      next();
    } catch (error) {
      logger.error('Optional auth error', error);
      next(); // Continue without auth
    }
  };

  /**
   * Extract and forward auth headers to downstream services
   */
  forwardAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Forward cookies
    if (req.cookies?.accessToken) {
      req.headers['x-access-token'] = req.cookies.accessToken;
    }
    
    if (req.cookies?.refreshToken) {
      req.headers['x-refresh-token'] = req.cookies.refreshToken;
    }
    
    if (req.cookies?.sessionId) {
      req.headers['x-session-id'] = req.cookies.sessionId;
    }
    
    // Forward user info if authenticated
    if (req.user) {
      req.headers['x-user-id'] = req.user.id;
      req.headers['x-user-email'] = req.user.email;
      req.headers['x-user-role'] = req.user.role;
      req.headers['x-user-status'] = req.user.status;
    }
    
    next();
  };
}