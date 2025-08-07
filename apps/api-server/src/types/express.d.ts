import { User } from '../entities/User';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
      sessionId?: string;
      // Analytics middleware properties
      analytics?: {
        sessionId: string;
        startTime: number;
        betaUserId?: string;
        userAgent: string;
        ipAddress: string;
      };
      // Add other custom properties that are used in the API
    }
  }
}

export {};