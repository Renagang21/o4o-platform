import { Request } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { ForumPost, ForumPostLike } from '@o4o/forum-core/entities';
// ForumCategory removed — WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1
import { ForumCategoryRequest } from '@o4o/forum-core/entities';
import { ForumComment } from '@o4o/forum-core/entities';
import { User } from '../../modules/auth/entities/User.js';
import type { SelectQueryBuilder } from 'typeorm';
import type { ForumContext } from '../../middleware/forum-context.middleware.js';
// WO-O4O-FORUM-AUTHOR-PII-GUARD-V1: service-aware closed-forum bypass
import {
  resolveCanonicalServiceKey,
  resolveRolePrefixFromCanonicalServiceKey,
} from '@o4o/security-core';
import { isPlatformAdmin, isServiceOperator } from '../../utils/role.utils.js';
import type { ServiceKey } from '../../types/roles.js';

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

  // WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1: categoryRepository now points to ForumCategoryRequest
  protected get categoryRepository() {
    return AppDataSource.getRepository(ForumCategoryRequest);
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
   * WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1: service boundary
   *
   * Service boundary (applied FIRST, before every scope branch):
   *   ctx.serviceCode (RBAC role prefix, e.g. 'kpa')
   *     → resolveCanonicalServiceKey()  ('kpa-society')
   *     → forum_category_requests.service_code
   *   Each scope branch below returns early, so the service condition must be
   *   ANDed before them or it would be skipped for community/organization/demo.
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

    // WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1
    // Service isolation. MUST stay above the scope branches — each of them returns.
    // ctx.serviceCode is the RBAC role prefix; the ledger column is the canonical
    // service key, so the conversion SSOT (@o4o/security-core) is used here.
    // No forum-local mapping table is introduced.
    this.applyServiceScope(qb, alias, ctx);

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

  /**
   * WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1
   *
   * AND the service boundary onto a post QueryBuilder.
   *
   * Canonical contract:
   *   서비스 route → forumContextMiddleware → ForumContext.serviceCode (RBAC prefix)
   *   → resolveCanonicalServiceKey() → forum_category_requests.service_code
   *
   * Deliberately does NOT filter on forum status — status는 별도 정책이며 여기서
   * 함께 걸면 기존 서비스(KPA 등)의 노출 범위를 이 WO 밖에서 축소한다.
   */
  protected applyServiceScope<T>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    ctx: ForumContext | undefined,
  ): void {
    const canonical = this.getCanonicalServiceKey(ctx);
    if (!canonical) return; // generic/admin route — 무필터 현행 유지

    qb.andWhere(
      `EXISTS (
        SELECT 1 FROM forum_category_requests _svc
        WHERE _svc.id = ${alias}.forum_id
          AND _svc.service_code = :ctxServiceKey
      )`,
      { ctxServiceKey: canonical },
    );
  }

  /**
   * WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1
   * ForumContext.serviceCode(RBAC prefix) → canonical service key. undefined = 무경계.
   */
  protected getCanonicalServiceKey(ctx: ForumContext | undefined): string | undefined {
    const prefix = ctx?.serviceCode?.trim();
    if (!prefix) return undefined;
    return resolveCanonicalServiceKey(prefix);
  }

  /**
   * WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1
   * Write boundary: 대상 forum 이 현재 서비스 컨텍스트에 속하는지 확인한다.
   * 컨텍스트가 없으면(generic/admin) 현행대로 통과시킨다.
   */
  protected async isForumInServiceScope(
    forumId: string | null | undefined,
    ctx: ForumContext | undefined,
  ): Promise<boolean> {
    const canonical = this.getCanonicalServiceKey(ctx);
    if (!canonical) return true;
    if (!forumId) return false;

    const rows = await AppDataSource.query(
      `SELECT 1 FROM forum_category_requests WHERE id = $1 AND service_code = $2 LIMIT 1`,
      [forumId, canonical],
    );
    return rows.length > 0;
  }

  // ---------------------------------------------------------------------------
  // WO-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1
  // Interaction(댓글 / 좋아요 / 고정) 공통 target 해석기.
  //
  // Canonical authorization 순서 (§3):
  //   인증 → service context → service scope 안에서 target 조회 → closed forum 판정
  //   → ownership/operator/admin 판정 → mutation → count/derived state
  //
  // 아래 helper 는 "raw entity lookup 후 나중에 service scope 확인" 패턴을 없애기 위한
  // 단일 진입점이다. 경로마다 service scope 코드를 복제하지 않는다.
  // ---------------------------------------------------------------------------

  /**
   * postId 를 현재 서비스 컨텍스트 안에서 해석한다.
   * - 존재하지 않음 / 타 서비스 forum 소속 → null (호출자는 동일하게 404 로 응답한다 = 비공개)
   * - generic/admin 경로(컨텍스트 없음) → 기존대로 무경계 통과
   */
  protected async resolveForumPostInServiceScope(
    postId: string,
    ctx: ForumContext | undefined,
  ): Promise<ForumPost | null> {
    if (!postId) return null;
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) return null;
    if (!(await this.isForumInServiceScope(post.forumId, ctx))) return null;
    return post;
  }

  /**
   * commentId → comment → post → forum → service scope 로 해석한다.
   * 어느 단계에서든 경계를 벗어나면 null 이며, 호출자는 404 로 응답한다.
   */
  protected async resolveForumCommentInServiceScope(
    commentId: string,
    ctx: ForumContext | undefined,
    options: { relations?: string[] } = {},
  ): Promise<{ comment: ForumComment; post: ForumPost | null } | null> {
    if (!commentId) return null;
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      ...(options.relations ? { relations: options.relations } : {}),
    });
    if (!comment) return null;

    const post = comment.postId
      ? await this.postRepository.findOne({ where: { id: comment.postId } })
      : null;

    // 댓글은 post 를 통해서만 서비스에 귀속된다. post 가 없으면(고아 댓글) 경계 판정 불가 →
    // 서비스 컨텍스트가 있는 경로에서는 노출하지 않는다.
    const canonical = this.getCanonicalServiceKey(ctx);
    if (canonical) {
      if (!post) return null;
      if (!(await this.isForumInServiceScope(post.forumId, ctx))) return null;
    }

    return { comment, post };
  }

  /**
   * 폐쇄형 포럼 쓰기 접근 판정.
   * 읽기(checkClosedForumAccess)와 동일한 멤버십/운영자 계약을 쓰기에도 그대로 적용한다.
   * 새로운 membership 정책을 도입하지 않는다.
   */
  protected async assertForumWriteAccess(
    forumId: string | null | undefined,
    userId: string | undefined,
    userRoles: string[],
  ): Promise<{ allowed: boolean; forumType?: string }> {
    if (!forumId) return { allowed: true };
    return this.checkClosedForumAccess(forumId, userId, userRoles);
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
   * WO-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1 §8
   *
   * forum 소유자 외에 moderation override 가 성립하는지 판정한다.
   * 판정 기준은 closed forum bypass 와 **동일한 규칙을 재사용**한다:
   *   - platform admin/super_admin → 전역 허용
   *   - 해당 forum 의 service_code 에 대응하는 service operator/admin → 같은 서비스만 허용
   * 새로운 권한 개념을 만들지 않는다 (cross-service operator bypass 없음).
   */
  protected async hasForumModerationOverride(
    forumId: string | null | undefined,
    userRoles: string[],
  ): Promise<boolean> {
    if (!forumId) return false;
    if (isPlatformAdmin(userRoles)) return true;
    const [forum] = await AppDataSource.query(
      `SELECT service_code FROM forum_category_requests WHERE id = $1 LIMIT 1`,
      [forumId],
    );
    if (!forum || !forum.service_code) return false;
    const rolePrefix = resolveRolePrefixFromCanonicalServiceKey(forum.service_code);
    return rolePrefix ? isServiceOperator(userRoles, rolePrefix as ServiceKey) : false;
  }

  /**
   * Check if the caller may access a closed forum.
   * - forumType != 'closed' → always allowed
   * - closed → member / owner / admin / operator only
   */
  protected async checkClosedForumAccess(
    forumId: string,
    userId: string | undefined,
    userRoles: string[],
  ): Promise<{ allowed: boolean; forumType?: string }> {
    // WO-O4O-FORUM-CATEGORY-CLEANUP-V1: query forum_category_requests (not forum_category)
    // WO-O4O-FORUM-AUTHOR-PII-GUARD-V1: include service_code for service-scoped bypass
    const [forum] = await AppDataSource.query(
      `SELECT id, forum_type, requester_id, service_code FROM forum_category_requests WHERE id = $1 LIMIT 1`,
      [forumId],
    );
    if (!forum) return { allowed: true }; // 404 handled by caller
    if (!forum.forum_type || forum.forum_type !== 'closed') {
      return { allowed: true, forumType: forum.forum_type };
    }

    // Admin / operator bypass — WO-O4O-FORUM-AUTHOR-PII-GUARD-V1 (S3)
    // Platform admin/super_admin bypass globally; service operators/admins bypass
    // ONLY for closed forums belonging to their own service (no cross-service bypass).
    const rolePrefix = forum.service_code
      ? resolveRolePrefixFromCanonicalServiceKey(forum.service_code)
      : null;
    const bypass =
      isPlatformAdmin(userRoles) ||
      (rolePrefix ? isServiceOperator(userRoles, rolePrefix as ServiceKey) : false);
    if (bypass) {
      return { allowed: true, forumType: 'closed' };
    }

    if (!userId) return { allowed: false, forumType: 'closed' };

    // Membership check (owner or member)
    const [member] = await AppDataSource.query(
      `SELECT role FROM forum_category_members
       WHERE forum_category_id = $1 AND user_id = $2 LIMIT 1`,
      [forumId, userId],
    );
    if (member) return { allowed: true, forumType: 'closed' };

    // Fallback: requester_id (forum creator, before membership backfill)
    if (forum.requester_id === userId) return { allowed: true, forumType: 'closed' };

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
    // WO-O4O-FORUM-AUTHOR-PII-GUARD-V1 (S1): strip author PII from public forum responses.
    // Public author display uses name/nickname/avatar only; email/phone/real-name are PII.
    // Opt-in contact fields (contactEnabled, kakaoOpenChatUrl, kakaoChannelUrl) are retained
    // because the showContactOnPost feature gates and renders them client-side.
    'email',
    'phone',
    'firstName',
    'lastName',
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
