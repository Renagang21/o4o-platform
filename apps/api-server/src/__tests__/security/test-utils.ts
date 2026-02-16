/**
 * Security Test Utilities
 *
 * Mock helpers for testing Express middleware guards
 * without HTTP server or database connections.
 */

import type { Request, Response, NextFunction } from 'express';

/** Create a mock user object matching SecurityUser shape */
export function createMockUser(overrides: {
  id?: string;
  roles?: string[];
  scopes?: string[];
} = {}) {
  return {
    id: overrides.id ?? 'test-user-001',
    roles: overrides.roles ?? [],
    scopes: overrides.scopes ?? [],
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
