import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import { AuthRequest } from '../types/auth.js';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(403).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        message: 'Access token is required for this endpoint'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;

    // Get user from database
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: decoded.userId || decoded.sub },
      relations: ['linkedAccounts', 'dbRoles', 'dbRoles.permissions']
    });

    if (!user) {
      return res.status(403).json({
        error: 'Invalid authentication',
        code: 'INVALID_USER',
        message: 'User account not found or has been deactivated'
      });
    }

    // Attach user to request (preserve User instance methods)
    req.user = user as any;
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Invalid authentication',
      code: 'INVALID_TOKEN',
      message: 'Access token is invalid or has expired'
    });
  }
};