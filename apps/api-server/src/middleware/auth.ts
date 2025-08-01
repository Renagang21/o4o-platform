import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/connection';
import { User } from '../entities/User';
import { AuthRequest, UserRole, UserStatus } from '../types/auth';
import { authService } from '../services/AuthService';

// Re-export AuthRequest for backward compatibility
export { AuthRequest };

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 개발 환경에서 DB 연결 없이 인증 우회
    if (!AppDataSource.isInitialized && process.env.NODE_ENV === 'development') {
      (req as AuthRequest).user = {
        id: 'dev-user-1',
        userId: 'dev-user-1',
        email: 'admin@o4o.com',
        name: '개발 관리자',
        role: UserRole.ADMIN,
        status: UserStatus.APPROVED,
        businessInfo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      };
      return next();
    }

    // First try cookie-based authentication
    const accessToken = req.cookies?.accessToken;
    if (accessToken) {
      const payload = authService.verifyAccessToken(accessToken);
      
      if (!payload) {
        // Try to refresh the token
        const refreshToken = req.cookies?.refreshToken;
        
        if (refreshToken) {
          const { userAgent, ipAddress } = authService.getRequestMetadata(req);
          const tokens = await authService.rotateRefreshToken(refreshToken, userAgent, ipAddress);
          
          if (tokens) {
            // Set new cookies
            authService.setAuthCookies(res, tokens);
            
            // Verify new access token
            const newPayload = authService.verifyAccessToken(tokens.accessToken);
            if (newPayload) {
              (req as AuthRequest).user = {
                id: newPayload.userId || newPayload.sub || '',
                userId: newPayload.userId || newPayload.sub || '',
                email: newPayload.email || '',
                role: newPayload.role as UserRole || UserRole.CUSTOMER,
                status: newPayload.status as UserStatus || UserStatus.ACTIVE,
                name: newPayload.name,
                businessInfo: newPayload.businessInfo,
                createdAt: newPayload.createdAt as Date || new Date(),
                updatedAt: newPayload.updatedAt as Date || new Date(),
                lastLoginAt: newPayload.lastLoginAt as Date
              };
              return next();
            }
          }
        }
        
        authService.clearAuthCookies(res);
        return res.status(401).json({
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        });
      }

      (req as AuthRequest).user = {
        id: payload.userId || payload.sub || '',
        userId: payload.userId || payload.sub || '',
        email: payload.email || '',
        role: payload.role as UserRole || UserRole.CUSTOMER,
        status: payload.status as UserStatus || UserStatus.ACTIVE,
        name: payload.name,
        businessInfo: payload.businessInfo,
        createdAt: payload.createdAt as Date || new Date(),
        updatedAt: payload.updatedAt as Date || new Date(),
        lastLoginAt: payload.lastLoginAt as Date
      };
      return next();
    }

    // Fall back to JWT Bearer token authentication for backward compatibility
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
      email?: string;
      role?: string;
      iat?: number;
      exp?: number;
    }
    const decoded = jwt.verify(token, jwtSecret) as JWTDecoded;
    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({ 
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
        error: 'Account not active',
        code: 'ACCOUNT_NOT_ACTIVE',
        status: user.status
      });
    }

    (req as AuthRequest).user = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      status: user.status as UserStatus,
      name: user.name,
      businessInfo: user.businessInfo,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    };
    next();
  } catch (error: any) {
    return res.status(401).json({ 
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(authReq.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: authReq.user.role
      });
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireManagerOrAdmin = requireRole(['admin', 'manager']);

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First try cookie-based authentication
    const accessToken = req.cookies?.accessToken;
    if (accessToken) {
      const payload = authService.verifyAccessToken(accessToken);
      if (payload) {
        (req as AuthRequest).user = {
          id: payload.userId || payload.sub || '',
          userId: payload.userId || payload.sub || '',
          email: payload.email || '',
          role: payload.role as UserRole || UserRole.CUSTOMER,
          status: payload.status as UserStatus || UserStatus.ACTIVE,
          name: payload.name,
          businessInfo: payload.businessInfo,
          createdAt: payload.createdAt as Date || new Date(),
          updatedAt: payload.updatedAt as Date || new Date(),
          lastLoginAt: payload.lastLoginAt as Date
        };
        return next();
      }
    }

    // Fall back to JWT Bearer token authentication
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
      email?: string;
      role?: string;
      iat?: number;
      exp?: number;
    }
    const decoded = jwt.verify(token, jwtSecret) as JWTDecoded;
    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({ 
      where: { id: decoded.userId },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'createdAt', 'updatedAt', 'lastLoginAt']
    });
    
    if (user && user.status === UserStatus.APPROVED) {
      (req as AuthRequest).user = {
        id: user.id,
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
        status: user.status as UserStatus,
        name: user.name,
        businessInfo: user.businessInfo,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt
      };
    }

    next();
  } catch (error: any) {
    // Continue without authentication
    next();
  }
};
