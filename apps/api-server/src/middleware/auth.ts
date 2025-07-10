import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/connection';
import { User } from '../entities/User';
import { AuthRequest, UserRole, UserStatus } from '../types/auth';

// Re-export AuthRequest for backward compatibility
export { AuthRequest };

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
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
    const decoded = jwt.verify(token, jwtSecret) as any;
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
      role: user.role as any, // Type casting needed as role is string in DB
      status: user.status as any // Type casting needed as status is string in DB
    };
    next();
  } catch (error) {
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
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
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
        role: user.role as any,
        status: user.status as any
      };
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
