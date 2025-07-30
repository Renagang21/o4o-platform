// Express Request 타입 확장
import { UserRole, UserStatus } from './auth';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole | string;
        status?: UserStatus | string;
        name?: string;
        businessInfo?: {
          companyName?: string;
          businessType?: string;
          taxId?: string;
          address?: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
          };
          contactInfo?: {
            phone: string;
            website?: string;
          };
          metadata?: Record<string, string | number | boolean>;
        };
        permissions?: string[];
        domain?: string;
        betaUserId?: string;
        createdAt?: Date | string;
        updatedAt?: Date | string;
        lastLoginAt?: Date | string;
      };
    }
  }
}

export {};
