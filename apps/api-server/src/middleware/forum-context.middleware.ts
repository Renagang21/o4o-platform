/**
 * Forum Context Middleware
 *
 * WO-O4O-FORUM-SERVICE-CONTEXT-IMPLEMENTATION-V1
 *
 * Injects ForumContext into req based on route prefix.
 * ForumController uses this context to filter posts/categories
 * by organizationId + isOrganizationExclusive.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

// ============================================================================
// Types
// ============================================================================

export interface ForumContext {
  /** Organization UUID — null means global (admin-dashboard) */
  organizationId?: string | null;
  /**
   * Community boundary key — WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1
   *
   * 논리 Community Identity (`config/community-catalog.ts` 의 key: 'pharmacy' | 'cosmetics' | 'o4o-general' | …).
   * 지정되면 `serviceCode` 대신 이 값이 읽기·쓰기 경계다: ForumControllerBase 가 catalog 의
   * `forumStorageCodes`(원장 `forum_category_requests.service_code` 집합) 로 해석한다 — KPA 와
   * Pharmacy-Hub 진입이 같은 'pharmacy' 를 보는 이유. Community ≠ Service 이므로 이 값으로
   * 운영자 권한을 추론하지 않는다 (moderation 은 forum 의 service_code 로 그대로 판정).
   */
  communityKey?: string;
  /**
   * Service boundary key — NOT a logging label.
   *
   * WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1
   *
   * RBAC role prefix ('kpa' | 'cosmetics' | 'pharmacy-hub' | 'neture').
   * ForumControllerBase converts it with resolveCanonicalServiceKey() and matches
   * forum_category_requests.service_code, so this value decides which service's
   * forums/posts are readable and writable. 값이 없으면 격리가 적용되지 않는다.
   */
  serviceCode?: string;
  /**
   * Forum scope — determines query filtering strategy
   * - 'community': only posts with organizationId IS NULL (공동 커뮤니티)
   * - 'organization': only posts matching organizationId (조직 전용)
   * - 'demo': demo/test mode — returns empty data, no community content
   * - undefined: legacy behavior (isOrganizationExclusive filter)
   *
   * WO-FORUM-SCOPE-SEPARATION-V1
   * WO-FORUM-DEMO-SCOPE-ISOLATION-V1: Added 'demo' scope
   */
  scope?: 'community' | 'organization' | 'demo';
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      forumContext?: ForumContext;
    }
  }
}

// ============================================================================
// Middleware factory
// ============================================================================

/**
 * Create middleware that injects a fixed ForumContext for all requests
 * in a given route group.
 *
 * Usage:
 *   forumRouter.use(forumContextMiddleware({ serviceCode: 'cosmetics', organizationId: '...' }));
 *
 * When organizationId is null the controller shows only non-exclusive content.
 * When organizationId is set the controller shows non-exclusive + matching exclusive content.
 */
export function forumContextMiddleware(context: ForumContext): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.forumContext = context;
    next();
  };
}

/**
 * Resolver function type for dynamic organizationId lookup.
 * Receives the authenticated user's ID (or null) and returns an organizationId.
 */
export type ForumOrgResolver = (userId: string | null) => Promise<string | null>;

/**
 * Create middleware that resolves ForumContext dynamically per-request.
 *
 * Used for KPA where organizationId = user's branch membership.
 * When resolver returns null (unauthenticated / no membership), the context
 * has organizationId=null and the controller shows only non-exclusive content.
 */
export function forumContextDynamic(
  serviceCode: string,
  resolver: ForumOrgResolver,
): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id ?? null;
      const organizationId = await resolver(userId);
      req.forumContext = { serviceCode, organizationId };
    } catch {
      req.forumContext = { serviceCode, organizationId: null };
    }
    next();
  };
}
