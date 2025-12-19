import { Request, Response, NextFunction } from 'express';
import { SessionSyncService } from '../services/sessionSyncService.js';
import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import type { AuthRequest } from '../types/auth.js';

/**
 * Middleware to validate SSO session
 */
export const validateSSOSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.cookies?.sessionId;
    
    if (!sessionId) {
      res.status(401).json({
        error: 'No session found',
        code: 'NO_SESSION'
      });
      return;
    }

    const sessionData = await SessionSyncService.validateSession(sessionId);
    
    if (!sessionData) {
      res.clearCookie('sessionId', {
        domain: process.env.COOKIE_DOMAIN || undefined
      });
      res.status(401).json({
        error: 'Invalid or expired session',
        code: 'INVALID_SESSION'
      });
      return;
    }

    // Get full user data
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: sessionData.userId },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'permissions']
    });

    if (!user) {
      res.clearCookie('sessionId', {
        domain: process.env.COOKIE_DOMAIN || undefined
      });
      res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Add user to request
    req.user = user;

    next();
  } catch (error: any) {
    // Error log removed
    res.status(500).json({
      error: 'Session validation failed',
      code: 'SESSION_ERROR'
    });
  }
};

/**
 * Middleware for optional SSO session validation
 */
export const optionalSSOSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.cookies?.sessionId;
    
    if (!sessionId) {
      return next();
    }

    const sessionData = await SessionSyncService.validateSession(sessionId);
    
    if (!sessionData) {
      // Clear invalid session cookie
      res.clearCookie('sessionId', {
        domain: process.env.COOKIE_DOMAIN || undefined
      });
      return next();
    }

    // Get full user data
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: sessionData.userId },
      select: ['id', 'email', 'name', 'role', 'status', 'businessInfo', 'permissions']
    });

    if (user) {
      req.user = user;
    }

    next();
  } catch (error: any) {
    // Continue without session
    next();
  }
};