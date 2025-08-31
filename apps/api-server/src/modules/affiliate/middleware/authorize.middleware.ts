import { Request, Response, NextFunction } from 'express';

export interface AuthorizedRequest extends Request {
  user?: any;
}

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (req: AuthorizedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user is admin or the affiliate owner
 */
export const requireAdminOrAffiliate = (req: AuthorizedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Admin can access everything
  if (req.user.role === 'admin') {
    next();
    return;
  }

  // Check if user is accessing their own affiliate data
  const affiliateUserId = req.params.affiliateUserId || 
                         req.query.affiliateUserId || 
                         req.body?.affiliateUserId;

  if (req.user.role === 'affiliate' && req.user.affiliateId === affiliateUserId) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    error: 'You can only access your own affiliate data',
    timestamp: new Date().toISOString()
  });
};

/**
 * Middleware to check if request is from system/internal service
 */
export const requireSystem = (req: AuthorizedRequest, res: Response, next: NextFunction): void => {
  // Check for system token or internal service authentication
  const systemToken = req.headers['x-system-token'];
  
  if (systemToken === process.env.INTERNAL_SERVICE_TOKEN) {
    req.user = {
      id: 'system',
      email: 'system@internal',
      role: 'system'
    };
    next();
    return;
  }

  // Also allow admin users
  if (req.user?.role === 'admin') {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    error: 'System access required',
    timestamp: new Date().toISOString()
  });
};