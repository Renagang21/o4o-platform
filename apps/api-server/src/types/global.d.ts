import { JWTPayload } from './auth';
import { UserRole, UserStatus } from './auth';
import { BusinessInfo } from './user';
import 'express';

declare global {
  namespace Express {
    interface User {
      id?: string;  // Make optional for compatibility
      userId?: string;  // Make userId optional as some places use id
      email?: string;  // Make optional for compatibility
      role?: UserRole | string;  // Allow string for backward compatibility
      status?: UserStatus | string;  // Allow string for backward compatibility
      name?: string;
      businessInfo?: BusinessInfo | any;  // Allow any for backward compatibility
      createdAt?: Date | string;  // Allow string for compatibility
      updatedAt?: Date | string;  // Allow string for compatibility
      lastLoginAt?: Date | string;  // Allow string for compatibility
      betaUserId?: string;
      iat?: number;
      exp?: number;
      // Additional properties from User entity
      firstName?: string;
      lastName?: string;
      avatar?: string;
      permissions?: string[];
      domain?: string;
      [key: string]: any;  // Allow additional properties
    }
    
    interface Request {
      user?: User;
      startTime?: number;
    }
  }
}

export {};