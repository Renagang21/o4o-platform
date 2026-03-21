import { Request } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { ForumPost, ForumPostLike } from '@o4o/forum-core/entities';
import { ForumCategory } from '@o4o/forum-core/entities';
import { ForumComment } from '@o4o/forum-core/entities';
import { User } from '../../modules/auth/entities/User.js';
import type { SelectQueryBuilder } from 'typeorm';
import type { ForumContext } from '../../middleware/forum-context.middleware.js';

/**
 * ForumControllerBase
 *
 * Shared repositories, context helpers, and utility methods
 * used by all forum sub-controllers.
 */
export class ForumControllerBase {
  protected get postRepository() {
    return AppDataSource.getRepository(ForumPost);
  }

  protected get categoryRepository() {
    return AppDataSource.getRepository(ForumCategory);
  }

  protected get commentRepository() {
    return AppDataSource.getRepository(ForumComment);
  }

  protected get userRepository() {
    return AppDataSource.getRepository(User);
  }

  protected get likeRepository() {
    return AppDataSource.getRepository(ForumPostLike);
  }

  /**
   * Extract ForumContext from req (set by forumContextMiddleware).
   * Returns undefined when no middleware is mounted (generic /api/v1/forum).
   */
  protected getForumContext(req: Request): ForumContext | undefined {
    return (req as any).forumContext;
  }

  /**
   * Apply scope-aware filter to a QueryBuilder.
   *
   * WO-FORUM-SCOPE-SEPARATION-V1: scope-based filtering
   * WO-FORUM-DEMO-SCOPE-ISOLATION-V1: demo scope returns empty results
   *
   * Rules:
   * - No context (admin-dashboard /api/v1/forum): no filter → see everything
   * - scope='community': only organizationId IS NULL (커뮤니티 전용)
   * - scope='organization' + organizationId: only matching org posts
   * - scope='demo': returns empty results (demo mode — no community content)
   * - Legacy (no scope) + organizationId: non-exclusive + matching exclusive
   * - Legacy (no scope) + no organizationId: non-exclusive only
   */
  protected applyContextFilter<T>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    ctx: ForumContext | undefined,
  ): void {
    if (!ctx) return; // admin/generic route — no filter

    // WO-FORUM-DEMO-SCOPE-ISOLATION-V1: demo scope returns empty results
    // /demo/forum should not show community content
    if (ctx.scope === 'demo') {
      qb.andWhere('1 = 0'); // Always false — returns empty results
      return;
    }

    // WO-FORUM-SCOPE-SEPARATION-V1: explicit scope filtering
    if (ctx.scope === 'community') {
      qb.andWhere(`${alias}.organizationId IS NULL`);
      return;
    }

    if (ctx.scope === 'organization' && ctx.organizationId) {
      qb.andWhere(`${alias}.organizationId = :ctxOrgId`, { ctxOrgId: ctx.organizationId });
      return;
    }

    // Legacy behavior (no scope set — e.g. glycopharm)
    if (ctx.organizationId) {
      qb.andWhere(
        `(${alias}.isOrganizationExclusive = false OR ${alias}.organizationId = :ctxOrgId)`,
        { ctxOrgId: ctx.organizationId },
      );
    } else {
      qb.andWhere(`${alias}.isOrganizationExclusive = false`);
    }
  }

  protected generateSlug(text: string): string {
    const timestamp = Date.now().toString(36);
    const baseSlug = text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 180);

    return `${baseSlug}-${timestamp}`;
  }
}
