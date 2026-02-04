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
  /** Service code for logging/debugging */
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
 *   forumRouter.use(forumContextMiddleware({ serviceCode: 'glycopharm', organizationId: '...' }));
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
