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
  /** Server-resolved DB community scope. Never accepted from the request body/query. */
  forumStorageCodes?: string[];
  communityOperator?: boolean;
  /** Generic public endpoints cannot expose independently gated DB spaces. */
  excludeScopedCommunities?: boolean;
  /** Organization UUID — null means global (admin-dashboard) */
  organizationId?: string | null;
  /**
   * 서버가 검증한 커뮤니티/사업 공간의 경계 키.
   * 독립서비스는 community, 사업 회원 공간은 검증된 사업별 저장 범위를 사용한다.
   * 과거 pharmacy/cosmetics/o4o-general은 차단용 tombstone이며 현재 카탈로그가 아니다.
   * 키 문자열만으로 회원·운영 자격을 추론하지 않는다. 활성 소속·역할·사업 권한은
   * 각 resolver가 확인하고 ForumControllerBase의 저장 범위 필터를 유지한다.
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
declare module 'express-serve-static-core' {
  interface Request {
    forumContext?: ForumContext;
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
