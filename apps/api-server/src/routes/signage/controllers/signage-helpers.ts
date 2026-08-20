import type { Request } from 'express';
import type { ScopeFilter } from '../dto/index.js';
import { getSignageServiceKey } from '../../../middleware/signage-role.middleware.js';

/**
 * Extract scope filter from request.
 * serviceKey MUST come from route param only (header fallback removed for security).
 * organizationId from query param or header.
 *
 * WO-O4O-KCOS-SIGNAGE-SERVICEKEY-CANONICALIZATION-V1:
 *   route param 은 canonical SSOT 로 정규화한 뒤 사용한다 — 역할 prefix alias
 *   ('cosmetics' / 'kpa') 가 데이터 scope(`serviceKey` 컬럼)로 새지 않게 한다.
 */
export function extractScope(req: Request): ScopeFilter {
  const serviceKey = getSignageServiceKey(req);
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
