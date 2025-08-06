import { User } from '../entities/User';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
      sessionId?: string;
      // Add other custom properties that are used in the API
    }
  }
}

export {};