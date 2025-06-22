import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/connection';
import { User } from '../entities/User';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string;        // 선택적 필드로 변경
    status?: string;      // 선택적 필드로 변경
    businessInfo?: any;
    createdAt?: Date;
    updatedAt?: Date;
    lastLoginAt?: Date;
    [key: string]: any;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
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

    if (user.status !== 'approved') {
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

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
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

export const requireAdmin = requireRole(['admin']);
export const requireManagerOrAdmin = requireRole(['admin', 'manager']);
