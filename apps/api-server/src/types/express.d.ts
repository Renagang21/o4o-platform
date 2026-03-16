/**
 * Express Request Type Extensions
 *
 * This file extends the Express Request interface with custom properties
 * used throughout the api-server.
 *
 * NOTE: Express.User must be augmented directly (not inline on Request.user)
 * because @types/express defines `Request.user?: User` — the User interface
 * is the merge target, not the `user` property itself.
 */

import 'express';

declare global {
  namespace Express {
    /**
     * Authenticated user data attached by auth middleware
     */
    interface User {
      id?: string;
      userId?: string;
      email?: string;
      role?: string;
      roles?: string[];
      status?: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      permissions?: string[];
      isActive?: boolean;
      domain?: string;
      betaUserId?: string;
    }

    interface Request {
      /**
       * Analytics tracking data attached by AnalyticsMiddleware
       */
      analytics?: {
        sessionId: string;
        startTime: number;
        betaUserId?: string;
        userAgent: string;
        ipAddress: string;
      };

      /**
       * Organization ID — set by store auth middleware
       * WO-O4O-AUTH-CONTEXT-UNIFICATION-V1
       */
      organizationId?: string;

      /**
       * Unified auth context — set by requireStoreAuth / optionalStoreAuth
       * WO-O4O-AUTH-CONTEXT-UNIFICATION-V1
       */
      authContext?: {
        userId: string;
        organizationId: string;
        memberRole: string;
        roles: string[];
        serviceKey?: string;
      };
    }
  }
}

export {};
