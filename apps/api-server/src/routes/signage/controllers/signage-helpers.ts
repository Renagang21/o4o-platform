import type { Request } from 'express';
import type { ScopeFilter } from '../dto/index.js';

/**
 * Extract scope filter from request.
 * serviceKey MUST come from route param only (header fallback removed for security).
 * organizationId from query param or header.
 */
export function extractScope(req: Request): ScopeFilter {
  const serviceKey = req.params.serviceKey;
  const organizationId = req.query.organizationId as string || req.headers['x-organization-id'] as string;

  if (!serviceKey) {
    throw new Error('Service key is required');
  }

  return {
    serviceKey,
    organizationId: organizationId || undefined,
  };
}

/**
 * Extract user ID from request (assumes auth middleware sets req.user).
 */
export function extractUserId(req: Request): string | undefined {
  return (req as any).user?.id || (req as any).user?.userId;
}
