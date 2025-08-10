import { JWTPayload } from './auth';
import { UserRole, UserStatus } from './auth';
import { BusinessInfo } from './user';
import 'express';

declare global {
  namespace Express {
    interface User {
      id: string;  // Always present
      userId: string;  // Always present (same as id)
      email: string;  // Always present
      role: UserRole | string;
      status?: UserStatus | string;
      name?: string;
      businessInfo?: BusinessInfo | any;
      createdAt?: Date | string;
      updatedAt?: Date | string;
      lastLoginAt?: Date | string;
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