import { User } from '../entities/user.entity';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
      file?: Multer.File;
      files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
    }
  }
}

export {};