/**
 * Security Test Utilities
 *
 * Mock helpers for testing Express middleware guards
 * without HTTP server or database connections.
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Create a mock user object matching SecurityUser shape
 *
 * WO-O4O-LEGACY-BACKEND-JWT-SCOPE-BRANCH-REMOVAL-V1:
 *   `scopes` 를 제거했다. 인증 미들웨어가 req.user 에 scopes 를 채운 적이 없어
 *   guard 가 실제로 보는 값은 roles 뿐이다. mock 이 실제보다 넓으면 죽은 축을
 *   살아 있는 것처럼 검증하게 되므로 실제 shape 에 맞춘다.
 */
export function createMockUser(overrides: {
  id?: string;
  roles?: string[];
} = {}) {
  return {
    id: overrides.id ?? 'test-user-001',
    roles: overrides.roles ?? [],
  };
}

/** Create a mock Express Request with optional user */
export function createMockRequest(user?: ReturnType<typeof createMockUser>): Request {
  const req: any = {};
  if (user) {
    req.user = user;
  }
  return req as Request;
}

/** Create a mock Express Response that captures status + json */
export function createMockResponse(): Response & { statusCode: number; body: any } {
  const res: any = {
    statusCode: 0,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
  };
  return res;
}

/** Create a mock NextFunction that tracks whether it was called */
export function createMockNext(): NextFunction & { called: boolean } {
  let called = false;
  const next: any = () => {
    called = true;
  };
  Object.defineProperty(next, 'called', { get: () => called });
  return next;
}

/**
 * Execute a guard middleware and return the result.
 * Returns { allowed: true } if next() was called,
 * or { allowed: false, statusCode, body } if response was sent.
 */
export async function executeGuard(
  guardMiddleware: any,
  user?: ReturnType<typeof createMockUser>,
) {
  const req = createMockRequest(user);
  const res = createMockResponse();
  const next = createMockNext();

  await guardMiddleware(req, res, next);

  if (next.called) {
    return { allowed: true as const, statusCode: 0, body: null };
  }
  return { allowed: false as const, statusCode: res.statusCode, body: res.body };
}
