import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/auth';

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      status: 'error',
      message: 'Authentication required' 
    });
  }

  // Check for admin roles
  const adminRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
  if (!adminRoles.includes(req.user.role as UserRole)) {
    return res.status(403).json({ 
      status: 'error',
      message: 'Admin access required' 
    });
  }

  next();
};