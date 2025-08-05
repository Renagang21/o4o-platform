import { Request, Response, NextFunction } from 'express';
import { SessionSyncService } from '../services/sessionSyncService';

/**
 * Middleware to update session activity on each request
 */
export const updateSessionActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get session ID from cookie or header
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    
    if (sessionId && typeof sessionId === 'string') {
      // Update session activity in background (non-blocking)
      SessionSyncService.updateSessionActivity(sessionId).catch(err => {
        console.error('Failed to update session activity:', err);
      });
    }
  } catch (error) {
    // Don't block the request if session update fails
    console.error('Session activity middleware error:', error);
  }
  
  next();
};

/**
 * Middleware to validate session on protected routes
 */
export const validateSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    
    if (!sessionId || typeof sessionId !== 'string') {
      return next(); // Let auth middleware handle missing session
    }
    
    const sessionData = await SessionSyncService.validateSession(sessionId);
    
    if (!sessionData) {
      // Session invalid or expired - clear cookie
      res.clearCookie('sessionId');
      res.status(401).json({
        success: false,
        error: 'Session expired or invalid'
      });
      return;
    }
    
    // Attach session data to request for downstream use
    (req as any).session = sessionData;
    
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    next(); // Continue without session validation
  }
};