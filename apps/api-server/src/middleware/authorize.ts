import { Request, Response, NextFunction } from 'express';

// Use module augmentation to extend Express Request
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role?: string;
      roles?: string[];
    };
  }
}

/**
 * Authorization middleware to check user roles
 * @param allowedRoles Array of roles that are allowed to access the route
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Get user role(s)
    const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
    
    // Check if user has at least one of the allowed roles
    const hasPermission = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to access this resource'
        }
      });
    }

    next();
  };
};

// Export convenience functions for common role checks
export const adminOnly = authorize(['admin']);
export const editorOnly = authorize(['editor', 'admin']);
export const authorOnly = authorize(['author', 'editor', 'admin']);
export const contributorOnly = authorize(['contributor', 'author', 'editor', 'admin']);