import { Request, Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types/auth';

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;

  if (!authReq.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (authReq.user.role !== UserRole.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

export const requireAdmin = adminAuth;