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
    // 개발 환경에서 테스트 토큰 허용 또는 DB 연결 없이 인증 우회
    if (process.env.NODE_ENV === 'development') {
      // Bearer 토큰 확인
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      // 테스트 토큰이거나 DB 미연결인 경우 인증 우회
      if (token === 'test-token-for-development' || !AppDataSource.isInitialized) {
        // Create a mock User entity for development
        const devUser = new User();
        devUser.id = 'dev-user-1';
        devUser.email = 'admin@o4o.com';
        devUser.name = '개발 관리자';
        devUser.role = UserRole.ADMIN;
        devUser.status = UserStatus.APPROVED;
        devUser.createdAt = new Date();
        devUser.updatedAt = new Date();
        devUser.lastLoginAt = new Date();
        
        (req as AuthRequest).user = devUser;
        return next();
      }
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
              // Create User entity from token payload
              const tokenUser = new User();
              tokenUser.id = newPayload.userId || newPayload.sub || '';
              tokenUser.email = newPayload.email || '';
              tokenUser.role = newPayload.role as UserRole || UserRole.CUSTOMER;
              tokenUser.status = newPayload.status as UserStatus || UserStatus.ACTIVE;
              tokenUser.name = newPayload.name;
              tokenUser.businessInfo = newPayload.businessInfo;
              tokenUser.createdAt = newPayload.createdAt as Date || new Date();
              tokenUser.updatedAt = newPayload.updatedAt as Date || new Date();
              tokenUser.lastLoginAt = newPayload.lastLoginAt as Date;
              
              (req as AuthRequest).user = tokenUser;
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

      // Create User entity from token payload
      const cookieUser = new User();
      cookieUser.id = payload.userId || payload.sub || '';
      cookieUser.email = payload.email || '';
      cookieUser.role = payload.role as UserRole || UserRole.CUSTOMER;
      cookieUser.status = payload.status as UserStatus || UserStatus.ACTIVE;
      cookieUser.name = payload.name;
      cookieUser.businessInfo = payload.businessInfo;
      cookieUser.createdAt = payload.createdAt as Date || new Date();
      cookieUser.updatedAt = payload.updatedAt as Date || new Date();
      cookieUser.lastLoginAt = payload.lastLoginAt as Date;
      
      (req as AuthRequest).user = cookieUser;
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

    (req as AuthRequest).user = user;
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

    if (!roles.includes((authReq.user as any).role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: (authReq.user as any).role
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
        // Create User entity from token payload
        const refreshTokenUser = new User();
        refreshTokenUser.id = payload.userId || payload.sub || '';
        refreshTokenUser.email = payload.email || '';
        refreshTokenUser.role = payload.role as UserRole || UserRole.CUSTOMER;
        refreshTokenUser.status = payload.status as UserStatus || UserStatus.ACTIVE;
        refreshTokenUser.name = payload.name;
        refreshTokenUser.businessInfo = payload.businessInfo;
        refreshTokenUser.createdAt = payload.createdAt as Date || new Date();
        refreshTokenUser.updatedAt = payload.updatedAt as Date || new Date();
        refreshTokenUser.lastLoginAt = payload.lastLoginAt as Date;
        
        (req as AuthRequest).user = refreshTokenUser;
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
      (req as AuthRequest).user = user;
    }

    next();
  } catch (error: any) {
    // Continue without authentication
    next();
  }
};

// Export authenticateToken as authenticate for compatibility
export const authenticate = authenticateToken;
