import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/auth.js';

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      status: 'error',
      message: 'Authentication required' 
    });
  }

  // Check for admin roles using database roles
  if (!req.user.hasAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN])) {
    return res.status(403).json({
      status: 'error',
      message: 'Admin access required'
    });
  }

  next();
};