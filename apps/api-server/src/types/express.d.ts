import type { User as UserEntity } from '../entities/User';

declare global {
  namespace Express {
    interface Request {
      user?: UserEntity;
      userId?: string;
      file?: Multer.File;
      files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
      analytics?: {
        startTime: number;
        endTime?: number;
        duration?: number;
        statusCode?: number;
        method?: string;
        url?: string;
        userAgent?: string;
        ip?: string;
        ipAddress?: string;
        error?: any;
        sessionId?: string;
        betaUserId?: string;
      };
    }
  }
}

// Also augment express-serve-static-core module
declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    userId?: string;
    file?: Multer.File;
    files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
    analytics?: {
      startTime: number;
      endTime?: number;
      duration?: number;
      statusCode?: number;
      method?: string;
      url?: string;
      userAgent?: string;
      ip?: string;
      ipAddress?: string;
      error?: any;
      sessionId?: string;
      betaUserId?: string;
    };
  }
}

export {};