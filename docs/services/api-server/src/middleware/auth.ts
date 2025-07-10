import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/auth';

/**
 * Role-based access control middleware
 * Checks if the authenticated user has the required role(s)
 */
export function roleGuard(requiredRoles: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const userRole = authReq.user.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Optional authentication middleware
 * Attempts to authenticate the user but doesn't require it
 * Useful for routes that behave differently for authenticated vs non-authenticated users
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    // No token provided, continue without authentication
    authReq.user = undefined;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
    authReq.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
      domain: decoded.domain || null
    };
    next();
  } catch (error) {
    // Invalid token, continue without authentication
    authReq.user = undefined;
    next();
  }
}

/**
 * Standard authentication middleware
 * Requires a valid JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
    authReq.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
      domain: decoded.domain || null
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}