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
       * Authenticated user — set by requireAuth / optional auth middleware.
       *
       * WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1:
       *   이 선언은 종전에 `@types/passport` 가 제공하던 것이다. Passport 런타임을
       *   은퇴시키면서(전략을 쓰는 route 0 · IR §3-1) 타입 증강의 출처도 함께 사라졌다.
       *   `req.user` 는 Passport 와 무관하게 우리 인증 미들웨어가 붙이는 값이므로
       *   **소유권을 이쪽으로 가져온다** — 외부 타입 패키지에 의존하지 않는다.
       */
      user?: User;

      /**
       * Request correlation ID — set by requestLoggingMiddleware
       * WO-O4O-STRUCTURED-LOGGING-IMPLEMENTATION-V1
       */
      requestId?: string;

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
