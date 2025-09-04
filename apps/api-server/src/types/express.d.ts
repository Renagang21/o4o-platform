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

export {};