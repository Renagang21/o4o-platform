import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/auth';
import { hasPermission, ROLE_PERMISSIONS } from '../types/dropshipping';
import { User } from '../entities/User';

interface AuthenticatedRequest extends Request {
  user?: User & {
    id: string;
    role: UserRole;
    roles?: string[];
  };
}

// Check if user has specific dropshipping role
export const requireDropshippingRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const userRoles = req.user.roles || [req.user.role];
    const hasRequiredRole = allowedRoles.some(role => 
      userRoles.includes(role) || req.user?.role === role
    );

    if (!hasRequiredRole && !userRoles.includes(UserRole.ADMIN) && !userRoles.includes(UserRole.SUPER_ADMIN)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient role permissions' 
      });
    }

    next();
  };
};

// Check if user has specific permission
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const userRoles = req.user.roles || [req.user.role];
    
    if (!hasPermission(userRoles, permission)) {
      return res.status(403).json({ 
        success: false, 
        message: `Permission denied: ${permission}` 
      });
    }

    next();
  };
};

// Middleware for supplier-only routes
export const requireSupplier = requireDropshippingRole([UserRole.SUPPLIER]);

// Middleware for seller-only routes
export const requireSeller = requireDropshippingRole([UserRole.SELLER]);

// Middleware for affiliate-only routes
export const requireAffiliate = requireDropshippingRole([UserRole.AFFILIATE]);

// Middleware for supplier or seller routes
export const requireSupplierOrSeller = requireDropshippingRole([
  UserRole.SUPPLIER, 
  UserRole.SELLER
]);

// Middleware for any business role
export const requireBusinessRole = requireDropshippingRole([
  UserRole.SUPPLIER,
  UserRole.SELLER,
  UserRole.AFFILIATE,
  UserRole.VENDOR,
  UserRole.BUSINESS
]);

// Check if user owns the resource
export const requireResourceOwner = (resourceIdParam: string = 'id') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const resourceId = req.params[resourceIdParam];
    const userId = req.user.id;

    // Admins can access any resource
    const userRoles = req.user.roles || [req.user.role];
    if (userRoles.includes(UserRole.ADMIN) || userRoles.includes(UserRole.SUPER_ADMIN)) {
      return next();
    }

    // Check ownership based on the route
    // This is a simplified version - you'd need to implement actual ownership checks
    // based on your database structure
    
    // For now, we'll pass through and let the controller handle ownership
    req.body._requestUserId = userId;
    next();
  };
};

// Validate role transition
export const validateRoleTransition = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const requestedRole = req.body.role as UserRole;
  const currentRoles = req.user.roles || [req.user.role];

  // Define allowed transitions
  const allowedTransitions: Record<UserRole, UserRole[]> = {
    [UserRole.CUSTOMER]: [
      UserRole.SELLER,
      UserRole.AFFILIATE,
      UserRole.SUPPLIER
    ],
    [UserRole.SELLER]: [
      UserRole.SUPPLIER,
      UserRole.AFFILIATE
    ],
    [UserRole.AFFILIATE]: [
      UserRole.SELLER,
      UserRole.SUPPLIER
    ],
    [UserRole.SUPPLIER]: [
      UserRole.SELLER,
      UserRole.AFFILIATE
    ],
    // Admins can't transition to other roles
    [UserRole.ADMIN]: [],
    [UserRole.SUPER_ADMIN]: [],
    // Other roles
    [UserRole.VENDOR]: [UserRole.SELLER, UserRole.SUPPLIER],
    [UserRole.BUSINESS]: [UserRole.SELLER, UserRole.SUPPLIER, UserRole.AFFILIATE],
    [UserRole.MODERATOR]: [],
    [UserRole.PARTNER]: [UserRole.AFFILIATE],
    [UserRole.BETA_USER]: [UserRole.CUSTOMER],
    [UserRole.MANAGER]: []
  };

  // Check if transition is allowed
  let canTransition = false;
  for (const currentRole of currentRoles) {
    const role = currentRole as UserRole;
    if (allowedTransitions[role]?.includes(requestedRole)) {
      canTransition = true;
      break;
    }
  }

  // Admins can approve any transition
  if (currentRoles.includes(UserRole.ADMIN) || currentRoles.includes(UserRole.SUPER_ADMIN)) {
    canTransition = true;
  }

  if (!canTransition && requestedRole) {
    return res.status(403).json({ 
      success: false, 
      message: `Cannot transition from ${currentRoles.join(', ')} to ${requestedRole}` 
    });
  }

  next();
};

// Rate limiting for specific roles
export const roleBasedRateLimit = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next();
  }

  const userRoles = req.user.roles || [req.user.role];
  
  // Different rate limits for different roles
  const rateLimits: Record<string, number> = {
    [UserRole.CUSTOMER]: 100,
    [UserRole.AFFILIATE]: 500,
    [UserRole.SELLER]: 1000,
    [UserRole.SUPPLIER]: 1000,
    [UserRole.ADMIN]: 10000,
    [UserRole.SUPER_ADMIN]: 10000
  };

  // Set rate limit header based on highest role
  let maxLimit = 100;
  for (const role of userRoles) {
    const limit = rateLimits[role];
    if (limit && limit > maxLimit) {
      maxLimit = limit;
    }
  }

  res.setHeader('X-RateLimit-Limit', maxLimit.toString());
  next();
};