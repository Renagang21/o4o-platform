import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth.js';

export const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!authReq.user.hasAnyRole(roles)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};