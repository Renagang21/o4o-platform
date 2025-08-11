// Express Request type extensions
import { Request } from 'express';
import { User } from '../entities/User';
import { AccessTokenPayload } from './auth';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      analytics?: {
        userId?: string;
        sessionId?: string;
        userAgent?: string;
        ipAddress?: string;
        timestamp?: Date;
        startTime?: number;
        betaUserId?: string;
      };
      tokenPayload?: AccessTokenPayload;
      session?: {
        userId?: string;
        sessionId?: string;
      };
    }
  }
}

// Extend Request interface directly for auth middleware
declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    analytics?: {
      userId?: string;
      sessionId?: string;
      userAgent?: string;
      ipAddress?: string;
      timestamp?: Date;
      startTime?: number;
      betaUserId?: string;
    };
    tokenPayload?: AccessTokenPayload;
    session?: {
      userId?: string;
      sessionId?: string;
    };
  }
}