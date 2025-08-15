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
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    }
    
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
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