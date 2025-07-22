import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/connection';
import { User } from '../entities/User';
import { BetaUser } from '../entities/BetaUser';
import { authService } from '../services/AuthService';
import { UserRole, UserStatus, AccessTokenPayload, AuthRequest } from '../types/auth';

// Request 타입 확장 (새 SSO 시스템용)
declare module 'express-serve-static-core' {
  interface Request {
    user?: AccessTokenPayload;
  }
}

export class AuthMiddleware {
  private userRepository = AppDataSource.getRepository(User);
  private betaUserRepository = AppDataSource.getRepository(BetaUser);

  // Standard authentication for regular users
  verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        return res.status(401).json({ 
          error: 'Access token required',
          code: 'TOKEN_REQUIRED'
        });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET is not configured');
      }

      interface JWTDecoded {
        userId: string;
        betaUserId?: string;
        email?: string;
        role?: string;
        iat?: number;
        exp?: number;
      }
      const decoded = jwt.verify(token, jwtSecret) as JWTDecoded;
      
      const user = await this.userRepository.findOne({ 
        where: { id: decoded.userId },
        select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'createdAt', 'updatedAt', 'lastLoginAt']
      });
      
      if (!user) {
        return res.status(401).json({ 
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      if (user.status !== UserStatus.APPROVED) {
        return res.status(403).json({ 
          error: 'Account not approved',
          code: 'ACCOUNT_NOT_APPROVED',
          status: user.status
        });
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        businessInfo: user.businessInfo,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt
      };

      next();
    } catch (error) {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
  };

  // Beta user authentication
  verifyBetaUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        return res.status(401).json({ 
          error: 'Access token required',
          code: 'TOKEN_REQUIRED'
        });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET is not configured');
      }

      interface JWTDecoded {
        userId: string;
        betaUserId?: string;
        email?: string;
        role?: string;
        iat?: number;
        exp?: number;
      }
      const decoded = jwt.verify(token, jwtSecret) as JWTDecoded;
      
      // Check if it's a beta user token
      if (decoded.betaUserId) {
        const betaUser = await this.betaUserRepository.findOne({ 
          where: { id: decoded.betaUserId }
        });
        
        if (!betaUser) {
          return res.status(401).json({ 
            error: 'Invalid beta user token',
            code: 'INVALID_BETA_TOKEN'
          });
        }

        if (!betaUser.canProvideFeedback()) {
          return res.status(403).json({ 
            error: 'Beta user account not active',
            code: 'BETA_ACCOUNT_NOT_ACTIVE',
            status: betaUser.status
          });
        }

        req.user = {
          id: betaUser.id,
          email: betaUser.email,
          name: betaUser.name,
          role: 'beta_user',
          status: betaUser.status,
          betaUserId: betaUser.id,
          createdAt: betaUser.createdAt,
          updatedAt: betaUser.updatedAt
        };

        next();
      } else {
        // Fall back to regular user authentication
        await this.verifyToken(req, res, next);
      }
    } catch (error) {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
  };

  // Optional authentication - doesn't fail if no token
  optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return next();
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next();
      }

      interface JWTDecoded {
        userId: string;
        betaUserId?: string;
        email?: string;
        role?: string;
        iat?: number;
        exp?: number;
      }
      const decoded = jwt.verify(token, jwtSecret) as JWTDecoded;
      
      // Try beta user first
      if (decoded.betaUserId) {
        const betaUser = await this.betaUserRepository.findOne({ 
          where: { id: decoded.betaUserId }
        });
        
        if (betaUser && betaUser.canProvideFeedback()) {
          req.user = {
            id: betaUser.id,
            email: betaUser.email,
            name: betaUser.name,
            role: 'beta_user',
            status: betaUser.status,
            betaUserId: betaUser.id,
            createdAt: betaUser.createdAt,
            updatedAt: betaUser.updatedAt
          };
        }
      } else if (decoded.userId) {
        // Try regular user
        const user = await this.userRepository.findOne({ 
          where: { id: decoded.userId },
          select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'createdAt', 'updatedAt', 'lastLoginAt']
        });
        
        if (user && user.status === UserStatus.APPROVED) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            businessInfo: user.businessInfo,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLoginAt: user.lastLoginAt
          };
        }
      }

      next();
    } catch (error) {
      // Continue without authentication
      next();
    }
  };

  // Role-based authorization
  requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: roles,
          current: req.user.role
        });
      }

      next();
    };
  };

  // Admin only
  requireAdmin = this.requireRole(['admin']);

  // Manager or Admin
  requireManagerOrAdmin = this.requireRole(['admin', 'manager']);

  // Analytics access (admin, manager, or beta users for their own data)
  requireAnalyticsAccess = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admins and managers have full access
    if (['admin', 'manager'].includes(req.user.role)) {
      return next();
    }

    // Beta users can only access their own analytics data
    if (req.user.role === 'beta_user') {
      // Check if the request is for their own data
      const userId = req.params.userId || req.query.userId;
      if (userId && userId !== req.user.betaUserId) {
        return res.status(403).json({ 
          error: 'Can only access own analytics data',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
      return next();
    }

    return res.status(403).json({ 
      error: 'Insufficient permissions for analytics access',
      code: 'INSUFFICIENT_PERMISSIONS',
      required: ['admin', 'manager', 'beta_user'],
      current: req.user.role
    });
  };

  // System metrics access (admin only)
  requireSystemAccess = this.requireRole(['admin']);

  // Reports access (admin and manager)
  requireReportsAccess = this.requireRole(['admin', 'manager']);

  // Real-time analytics access (admin only for now)
  requireRealTimeAccess = this.requireRole(['admin']);

  // ==================== 새 SSO/JWT 인증 시스템 ==================== //

  /**
   * JWT 토큰 검증 미들웨어 (새 SSO 시스템)
   */
  authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      // 토큰 검증
      const payload = await authService.verifyAccessToken(token);
      req.user = payload;

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired access token'
      });
    }
  };

  /**
   * 역할 기반 접근 제어 미들웨어 (새 SSO 시스템)
   */
  requireRoles = (allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!allowedRoles.includes(req.user.role as UserRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  };

  /**
   * 권한 기반 접근 제어 미들웨어 (새 SSO 시스템)
   */
  requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // 관리자는 모든 권한 보유
      if (req.user.role === 'admin' || req.user.permissions.includes('*')) {
        return next();
      }

      if (!req.user.permissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Permission required: ${permission}`
        });
      }

      next();
    };
  };

  /**
   * 도메인별 접근 제어 미들웨어 (새 SSO 시스템)
   */
  requireDomain = (allowedDomains: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const requestDomain = req.headers.host || req.user.domain;
      
      if (!allowedDomains.some(domain => requestDomain.includes(domain))) {
        return res.status(403).json({
          success: false,
          message: 'Domain access not allowed'
        });
      }

      next();
    };
  };

  /**
   * 옵셔널 인증 미들웨어 (새 SSO 시스템)
   */
  optionalTokenAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        try {
          const payload = await authService.verifyAccessToken(token);
          req.user = payload;
        } catch (error) {
          // 토큰이 유효하지 않아도 계속 진행
        }
      }

      next();
    } catch (error) {
      next();
    }
  };

  /**
   * API 카테고리별 권한 매트릭스
   */
  private API_PERMISSIONS = {
    business: {
      customer: ['read:products', 'create:orders', 'read:own_orders'],
      seller: ['read:products', 'create:products', 'update:own_products', 'read:own_orders', 'read:analytics'],
      supplier: ['create:products', 'update:own_products', 'read:inventory', 'manage:inventory'],
      manager: ['read:all', 'manage:store', 'read:analytics'],
      admin: ['*']
    },
    admin: {
      admin: ['*'],
      manager: ['read:all', 'manage:store', 'read:analytics']
    },
    partner: {
      supplier: ['manage:inventory', 'read:partner_analytics'],
      manager: ['read:all', 'manage:partnerships'],
      admin: ['*']
    },
    internal: {
      admin: ['*']
    }
  } as const;

  /**
   * API 카테고리별 접근 제어 (새 SSO 시스템)
   */
  requireApiAccess = (category: keyof typeof this.API_PERMISSIONS) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const allowedRoles = Object.keys(this.API_PERMISSIONS[category]) as UserRole[];
      
      if (!allowedRoles.includes(req.user.role as UserRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied for ${category} API`
        });
      }

      next();
    };
  };
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();

// Export alias for roleGuard
export const roleGuard = authMiddleware.requireRoles;