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

  // ---------------------------------------------------------------------------
  // WO-KPA-A-CLOSED-FORUM-ACCESS-CONTROL-V1: closed forum access helpers
  // ---------------------------------------------------------------------------

  /** Extract user info from request (optionalAuth may leave user undefined) */
  protected getUserFromReq(req: Request): { userId?: string; roles: string[] } {
    const user = (req as any).user;
    return { userId: user?.id, roles: user?.roles || [] };
  }

  /**
   * Check if the caller may access a closed forum.
   * - forumType != 'closed' → always allowed
   * - closed → member / owner / admin / operator only
   */
  protected async checkClosedForumAccess(
    categoryId: string,
    userId: string | undefined,
    userRoles: string[],
  ): Promise<{ allowed: boolean; forumType?: string }> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      select: ['id', 'forumType', 'createdBy'],
    });
    if (!category) return { allowed: true }; // 404 handled by caller
    if (!category.forumType || category.forumType !== 'closed') {
      return { allowed: true, forumType: category.forumType };
    }

    // Admin / operator bypass
    const BYPASS_ROLES = ['kpa:admin', 'kpa:operator', 'platform:admin', 'platform:super_admin'];
    if (userRoles.some((r) => BYPASS_ROLES.includes(r))) {
      return { allowed: true, forumType: 'closed' };
    }

    if (!userId) return { allowed: false, forumType: 'closed' };

    // Membership check (owner or member)
    const [member] = await AppDataSource.query(
      `SELECT role FROM forum_category_members
       WHERE forum_category_id = $1 AND user_id = $2 LIMIT 1`,
      [categoryId, userId],
    );
    if (member) return { allowed: true, forumType: 'closed' };

    // Fallback: createdBy (before membership backfill)
    if (category.createdBy === userId) return { allowed: true, forumType: 'closed' };

    return { allowed: false, forumType: 'closed' };
  }

  // ---------------------------------------------------------------------------
  // WO-KPA-A-FORUM-CREATOR-SENSITIVE-FIELDS-EXPOSURE-HOTFIX-V1
  // ---------------------------------------------------------------------------

  /** Fields to ALWAYS strip from user objects in forum API responses */
  private static readonly SENSITIVE_USER_FIELDS = [
    'password',
    'refreshTokenFamily',
    'resetPasswordToken',
    'resetPasswordExpires',
    'loginAttempts',
    'lockedUntil',
    'lastLoginIp',
    'businessInfo',
    'provider',
    'provider_id',
    'approvedAt',
    'approvedBy',
  ];

  /** Strip sensitive fields from a user object (in-place mutation, safe for serialization) */
  protected sanitizeUser(user: any): void {
    if (!user) return;
    for (const field of ForumControllerBase.SENSITIVE_USER_FIELDS) {
      if (field in user) {
        delete user[field];
      }
    }
  }

  /**
   * Flatten joined author relation into flat field expected by frontend.
   * authorName = author.nickname ?? author.name ?? '시스템'
   *
   * Note: categoryName intentionally omitted — category structure removed.
   */
  protected flattenPostFields(post: any): any {
    const author = post.author;
    return {
      ...post,
      authorName: author?.nickname ?? author?.name ?? '시스템',
    };
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
