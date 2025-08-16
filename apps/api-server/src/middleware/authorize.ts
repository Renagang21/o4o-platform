import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types/auth';

/**
 * Authorization middleware to check user roles
 * @param allowedRoles Array of roles that are allowed to access the route
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Map role strings to UserRole enum
    const userRole = req.user.role;
    
    // Check if user's role is in the allowed roles
    const isAllowed = allowedRoles.some(role => {
      switch (role.toLowerCase()) {
        case 'admin':
          return userRole === UserRole.ADMIN;
        case 'staff':
          return userRole === UserRole.MODERATOR || userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
        case 'vendor':
          return userRole === UserRole.VENDOR || userRole === UserRole.ADMIN;
        case 'customer':
          return userRole === UserRole.CUSTOMER || userRole === UserRole.ADMIN;
        default:
          return false;
      }
    });

    if (!isAllowed) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole 
      });
    }

    next();
  };
};

/**
 * Check if user has admin role
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

/**
 * Check if user has staff role or higher
 */
export const requireStaff = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.MODERATOR && req.user.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ error: 'Staff access required' });
  }

  next();
};