import { User } from '../entities/User';

declare global {
  namespace Express {
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
        error?: any;
      };
    }
  }
}

export {};