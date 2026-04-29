/**
 * ForumQueryService — APP-FORUM 공용 쿼리 서비스
 *
 * Phase 1: 홈 페이지용 포럼 게시글 요약 쿼리를 공통 서비스로 추출.
 * KPA, Neture 등 모든 서비스가 동일한 쿼리 로직을 재사용.
 *
 * community scope: organization_id IS NULL (공동 커뮤니티)
 * organization scope: organization_id = config.organizationId (조직 전용)
 */

import { DataSource } from 'typeorm';

export interface ForumQueryConfig {
  scope: 'community' | 'organization';
  organizationId?: string;
}

export class ForumQueryService {
  constructor(
    private dataSource: DataSource,
    private config: ForumQueryConfig,
  ) {}

  /**
   * 홈 페이지용 최근 게시글 요약
   */
  async listRecentPosts(limit = 5) {
    if (this.config.scope === 'community') {
      return this.dataSource.query(`
        SELECT p.id, p.title, COALESCE(u.nickname, u.name) as "authorName", p.created_at as "createdAt", c.name as "categoryName"
        FROM forum_post p
        LEFT JOIN forum_category c ON p."categoryId" = c.id
        LEFT JOIN users u ON p.author_id = u.id
        WHERE p.status = 'publish' AND p.organization_id IS NULL
          AND (c.forum_type IS NULL OR c.forum_type != 'closed')
        ORDER BY p.created_at DESC
        LIMIT $1
      `, [limit]);
    }

    // organization scope
    return this.dataSource.query(`
      SELECT p.id, p.title, COALESCE(u.nickname, u.name) as "authorName", p.created_at as "createdAt", c.name as "categoryName"
      FROM forum_post p
      LEFT JOIN forum_category c ON p."categoryId" = c.id
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.status = 'publish' AND p.organization_id = $1
        AND (c.forum_type IS NULL OR c.forum_type != 'closed')
      ORDER BY p.created_at DESC
      LIMIT $2
    `, [this.config.organizationId, limit]);
  }

  /**
   * 포럼 허브 — 멀티 포럼 목록 (forum_category_requests 기반)
   *
   * WO-O4O-FORUM-MULTI-STRUCTURE-RECONSTRUCTION-V1
   * 카테고리 폐기 후 forum_category_requests를 포럼 엔티티로 사용.
   * status = 'completed' 인 행이 활성 포럼.
   *
   * 기존 응답 shape (id, name, slug, description, iconEmoji, postCount, forumType, tags,
   * memberCount, lastActivityAt, lastPostTitle)은 호환 유지.
   */
  async listForumHub(options?: { sort?: string; keyword?: string; userId?: string }) {
    const sort = options?.sort || 'default';
    const keyword = options?.keyword?.trim() || '';
    const userId = options?.userId?.trim() || '';

    if (sort === 'joined' && userId) {
      return this.listForumHubJoined(userId, keyword);
    }

    let orderBy: string;
    switch (sort) {
      case 'recent':
        orderBy = 'MAX(p.created_at) DESC NULLS LAST';
        break;
      case 'popular':
        orderBy = 'COUNT(p.id) DESC NULLS LAST';
        break;
      default:
        orderBy = 'MAX(p.created_at) DESC NULLS LAST, c.created_at DESC';
    }

    const params: any[] = [];
    let keywordFilter = '';
    if (keyword) {
      params.push(`%${keyword}%`);
      keywordFilter = `AND (c.name ILIKE $${params.length} OR c.description ILIKE $${params.length} OR c.tags::text ILIKE $${params.length})`;
    }

    let scopeFilter: string;
    if (this.config.scope === 'community') {
      scopeFilter = 'c.organization_id IS NULL';
    } else {
      params.push(this.config.organizationId);
      scopeFilter = `c.organization_id = $${params.length}`;
    }

    return this.dataSource.query(`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        NULL AS color,
        c.icon_emoji AS "iconEmoji",
        COUNT(p.id)::int AS "postCount",
        0 AS "sortOrder",
        false AS "isPinned",
        c.forum_type AS "forumType",
        c.tags,
        COUNT(DISTINCT p.author_id)::int AS "memberCount",
        MAX(p.created_at) AS "lastActivityAt",
        (SELECT p2.title FROM forum_post p2
         WHERE p2.forum_id = c.id AND p2.status = 'publish'
         ORDER BY p2.created_at DESC LIMIT 1) AS "lastPostTitle"
      FROM forum_category_requests c
      LEFT JOIN forum_post p ON p.forum_id = c.id AND p.status = 'publish'
      WHERE c.status = 'completed' AND ${scopeFilter} ${keywordFilter}
      GROUP BY c.id
      ORDER BY ${orderBy}
    `, params);
  }

  /**
   * Forum 단건 조회 — slug 기반.
   * WO-O4O-FORUM-MULTI-STRUCTURE-RECONSTRUCTION-V1
   */
  async getForumBySlug(slug: string) {
    const rows = await this.dataSource.query(`
      SELECT
        c.id, c.name, c.slug, c.description,
        c.icon_emoji AS "iconEmoji",
        c.forum_type AS "forumType",
        c.tags,
        c.organization_id AS "organizationId"
      FROM forum_category_requests c
      WHERE c.status = 'completed' AND c.slug = $1
      LIMIT 1
    `, [slug]);
    return rows[0] || null;
  }

  /**
   * Forum의 게시글 목록 — forum_id 기반.
   * WO-O4O-FORUM-MULTI-STRUCTURE-RECONSTRUCTION-V1
   */
  async listForumPosts(forumId: string, options?: { limit?: number; offset?: number }) {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    return this.dataSource.query(`
      SELECT
        p.id, p.title, p.slug, p.excerpt, p.tags,
        p.created_at AS "createdAt",
        p."viewCount", p."likeCount", p."commentCount",
        p.author_id AS "authorId",
        COALESCE(u.nickname, u.name) AS "authorName"
      FROM forum_post p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.forum_id = $1 AND p.status = 'publish'
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [forumId, limit, offset]);
  }

  /**
   * "내가 참여한 포럼" — 사용자가 글 또는 댓글을 작성한 forum_category_requests만 반환
   * WO-O4O-FORUM-MULTI-STRUCTURE-RECONSTRUCTION-V1: forum_id 기반 재구성
   */
  private async listForumHubJoined(userId: string, keyword: string) {
    const params: any[] = [userId];
    let keywordFilter = '';
    if (keyword) {
      params.push(`%${keyword}%`);
      keywordFilter = `AND (c.name ILIKE $${params.length} OR c.description ILIKE $${params.length} OR c.tags::text ILIKE $${params.length})`;
    }

    let scopeFilter: string;
    if (this.config.scope === 'community') {
      scopeFilter = 'c.organization_id IS NULL';
    } else {
      params.push(this.config.organizationId);
      scopeFilter = `c.organization_id = $${params.length}`;
    }

    return this.dataSource.query(`
      WITH my_forums AS (
        SELECT DISTINCT p.forum_id AS id FROM forum_post p
        WHERE p.author_id = $1 AND p.status = 'publish' AND p.forum_id IS NOT NULL
        UNION
        SELECT DISTINCT p.forum_id AS id FROM forum_comment fc
        JOIN forum_post p ON fc."postId" = p.id
        WHERE fc.author_id = $1 AND p.forum_id IS NOT NULL
      )
      SELECT
        c.id, c.name, c.slug, c.description,
        NULL AS color, c.icon_emoji AS "iconEmoji",
        COUNT(p.id)::int AS "postCount",
        0 AS "sortOrder", false AS "isPinned",
        c.forum_type AS "forumType", c.tags,
        COUNT(DISTINCT p.author_id)::int AS "memberCount",
        MAX(p.created_at) AS "lastActivityAt",
        (SELECT p2.title FROM forum_post p2
         WHERE p2.forum_id = c.id AND p2.status = 'publish'
         ORDER BY p2.created_at DESC LIMIT 1) AS "lastPostTitle"
      FROM forum_category_requests c
      INNER JOIN my_forums mf ON mf.id = c.id
      LEFT JOIN forum_post p ON p.forum_id = c.id AND p.status = 'publish'
      WHERE c.status = 'completed' AND ${scopeFilter} ${keywordFilter}
      GROUP BY c.id
      ORDER BY MAX(p.created_at) DESC NULLS LAST
    `, params);
  }

  /**
   * 포럼 활동 섹션 — 카테고리별 최근 게시글 (서버 집계)
   * Phase 3: LATERAL JOIN으로 카테고리별 top-N 게시글 집계
   * sort: recent(default) / popular(viewCount) / recommended(likeCount)
   */
  async listForumActivity(options?: { sort?: string; limit?: number }) {
    const sort = options?.sort || 'recent';
    const limit = options?.limit || 5;

    let postOrderBy: string;
    switch (sort) {
      case 'popular':
        postOrderBy = 'p."isPinned" DESC, p."viewCount" DESC, p.created_at DESC';
        break;
      case 'recommended':
        postOrderBy = 'p."isPinned" DESC, p."likeCount" DESC, p.created_at DESC';
        break;
      default:
        postOrderBy = 'p."isPinned" DESC, p.created_at DESC';
    }

    if (this.config.scope === 'community') {
      const rows: any[] = await this.dataSource.query(`
        SELECT
          c.id AS "categoryId", c.name AS "categoryName", c.slug AS "categorySlug",
          c.color AS "categoryColor", c."iconEmoji" AS "categoryIconEmoji",
          c."postCount" AS "categoryPostCount",
          lp.post_id AS "postId", lp.post_title AS "postTitle",
          lp.post_is_pinned AS "postIsPinned",
          lp.post_view_count AS "postViewCount",
          lp.post_comment_count AS "postCommentCount",
          lp.post_like_count AS "postLikeCount",
          lp.post_created_at AS "postCreatedAt",
          COALESCE(u.nickname, u.name) AS "postAuthorName"
        FROM forum_category c
        CROSS JOIN LATERAL (
          SELECT p.id as post_id, p.title as post_title,
                 p."isPinned" as post_is_pinned,
                 p."viewCount" as post_view_count,
                 p."commentCount" as post_comment_count,
                 p."likeCount" as post_like_count,
                 p.created_at as post_created_at,
                 p.author_id
          FROM forum_post p
          WHERE p."categoryId" = c.id
            AND p.status = 'publish' AND p.organization_id IS NULL
          ORDER BY ${postOrderBy}
          LIMIT $1
        ) lp
        LEFT JOIN users u ON lp.author_id = u.id
        WHERE c."isActive" = true AND c."accessLevel" = 'all' AND c."organizationId" IS NULL
          AND (c.forum_type IS NULL OR c.forum_type != 'closed')
        ORDER BY c."isPinned" DESC, c."pinnedOrder" ASC NULLS LAST,
                 c."sortOrder" ASC, c.name ASC
      `, [limit]);

      return this.groupActivityRows(rows);
    }

    // organization scope
    const rows: any[] = await this.dataSource.query(`
      SELECT
        c.id AS "categoryId", c.name AS "categoryName", c.slug AS "categorySlug",
        c.color AS "categoryColor", c."iconEmoji" AS "categoryIconEmoji",
        c."postCount" AS "categoryPostCount",
        lp.post_id AS "postId", lp.post_title AS "postTitle",
        lp.post_is_pinned AS "postIsPinned",
        lp.post_view_count AS "postViewCount",
        lp.post_comment_count AS "postCommentCount",
        lp.post_like_count AS "postLikeCount",
        lp.post_created_at AS "postCreatedAt",
        COALESCE(u.nickname, u.name) AS "postAuthorName"
      FROM forum_category c
      CROSS JOIN LATERAL (
        SELECT p.id as post_id, p.title as post_title,
               p."isPinned" as post_is_pinned,
               p."viewCount" as post_view_count,
               p."commentCount" as post_comment_count,
               p."likeCount" as post_like_count,
               p.created_at as post_created_at,
               p.author_id
        FROM forum_post p
        WHERE p."categoryId" = c.id
          AND p.status = 'publish' AND p.organization_id = $2
        ORDER BY ${postOrderBy}
        LIMIT $1
      ) lp
      LEFT JOIN users u ON lp.author_id = u.id
      WHERE c."isActive" = true AND c."accessLevel" = 'all' AND c."organizationId" = $2
        AND (c.forum_type IS NULL OR c.forum_type != 'closed')
      ORDER BY c."isPinned" DESC, c."pinnedOrder" ASC NULLS LAST,
               c."sortOrder" ASC, c.name ASC
    `, [limit, this.config.organizationId]);

    return this.groupActivityRows(rows);
  }

  private groupActivityRows(rows: any[]) {
    const categoryMap = new Map<string, any>();
    for (const row of rows) {
      if (!categoryMap.has(row.categoryId)) {
        categoryMap.set(row.categoryId, {
          id: row.categoryId,
          name: row.categoryName,
          slug: row.categorySlug,
          color: row.categoryColor,
          iconEmoji: row.categoryIconEmoji,
          postCount: row.categoryPostCount,
          recentPosts: [],
        });
      }
      categoryMap.get(row.categoryId)!.recentPosts.push({
        id: row.postId,
        title: row.postTitle,
        isPinned: row.postIsPinned,
        viewCount: row.postViewCount,
        commentCount: row.postCommentCount,
        likeCount: row.postLikeCount,
        createdAt: row.postCreatedAt,
        authorName: row.postAuthorName,
      });
    }
    return Array.from(categoryMap.values());
  }

  /**
   * 운영자용 포럼 통계 — KPI 4개 + Top 5 활성 + 무활동 포럼
   * 3개 병렬 쿼리로 집계
   */
  async getForumAnalytics() {
    const isCommunity = this.config.scope === 'community';
    const params = isCommunity ? [] : [this.config.organizationId];
    const scopeFilter = isCommunity
      ? 'p.organization_id IS NULL'
      : 'p.organization_id = $1';
    const catScopeFilter = isCommunity
      ? 'c."organizationId" IS NULL'
      : 'c."organizationId" = $1';
    const commentScopeFilter = isCommunity
      ? 'p.organization_id IS NULL'
      : 'p.organization_id = $1';

    const [kpiRows, topRows, inactiveRows] = await Promise.all([
      // Query 1: KPI 4개
      this.dataSource.query(`
        SELECT
          (SELECT COUNT(*)::int FROM forum_category c
           WHERE c."isActive" = true AND c."accessLevel" = 'all' AND ${catScopeFilter}
          ) AS "totalForums",
          (SELECT COUNT(DISTINCT p."categoryId")::int FROM forum_post p
           WHERE p.status = 'publish' AND ${scopeFilter}
             AND p.created_at >= NOW() - INTERVAL '7 days'
          ) AS "activeForumsByPost7d",
          (SELECT COUNT(DISTINCT p."categoryId")::int
           FROM forum_comment fc
           JOIN forum_post p ON fc."postId" = p.id
           WHERE ${commentScopeFilter}
             AND fc.created_at >= NOW() - INTERVAL '7 days'
          ) AS "activeForumsByComment7d",
          (SELECT COUNT(*)::int FROM forum_post p
           WHERE p.status = 'publish' AND ${scopeFilter}
             AND p.created_at >= NOW() - INTERVAL '7 days'
          ) AS "posts7d",
          (SELECT COUNT(*)::int
           FROM forum_comment fc
           JOIN forum_post p ON fc."postId" = p.id
           WHERE ${commentScopeFilter}
             AND fc.created_at >= NOW() - INTERVAL '7 days'
          ) AS "comments7d"
      `, params),
      // Query 2: Top 5 활성 포럼 (30일)
      this.dataSource.query(`
        SELECT
          c.id, c.name, c."iconEmoji",
          COUNT(DISTINCT CASE WHEN p.created_at >= NOW() - INTERVAL '30 days' THEN p.id END)::int AS "posts30d",
          COUNT(DISTINCT CASE WHEN fc.created_at >= NOW() - INTERVAL '30 days' THEN fc.id END)::int AS "comments30d"
        FROM forum_category c
        LEFT JOIN forum_post p ON p."categoryId" = c.id AND p.status = 'publish' AND ${scopeFilter}
        LEFT JOIN forum_comment fc ON fc."postId" = p.id
        WHERE c."isActive" = true AND c."accessLevel" = 'all' AND ${catScopeFilter}
        GROUP BY c.id
        HAVING COUNT(DISTINCT CASE WHEN p.created_at >= NOW() - INTERVAL '30 days' THEN p.id END) > 0
            OR COUNT(DISTINCT CASE WHEN fc.created_at >= NOW() - INTERVAL '30 days' THEN fc.id END) > 0
        ORDER BY (
          COUNT(DISTINCT CASE WHEN p.created_at >= NOW() - INTERVAL '30 days' THEN p.id END)
          + COUNT(DISTINCT CASE WHEN fc.created_at >= NOW() - INTERVAL '30 days' THEN fc.id END)
        ) DESC
        LIMIT 5
      `, params),
      // Query 3: 30일 무활동 포럼
      this.dataSource.query(`
        SELECT c.id, c.name, c."iconEmoji",
          MAX(p.created_at) AS "lastActivityAt"
        FROM forum_category c
        LEFT JOIN forum_post p ON p."categoryId" = c.id AND p.status = 'publish' AND ${scopeFilter}
        WHERE c."isActive" = true AND c."accessLevel" = 'all' AND ${catScopeFilter}
        GROUP BY c.id
        HAVING MAX(p.created_at) IS NULL
            OR MAX(p.created_at) < NOW() - INTERVAL '30 days'
        ORDER BY MAX(p.created_at) ASC NULLS FIRST
      `, params),
    ]);

    const kpi = kpiRows[0] || {};
    const activeForums7d = Math.max(kpi.activeForumsByPost7d || 0, kpi.activeForumsByComment7d || 0);

    return {
      totalForums: kpi.totalForums || 0,
      activeForums7d,
      posts7d: kpi.posts7d || 0,
      comments7d: kpi.comments7d || 0,
      topForums: topRows.map((r: any) => ({
        id: r.id,
        name: r.name,
        iconEmoji: r.iconEmoji,
        posts30d: r.posts30d,
        comments30d: r.comments30d,
        activityScore: r.posts30d + r.comments30d,
      })),
      inactiveForums30d: inactiveRows.map((r: any) => ({
        id: r.id,
        name: r.name,
        iconEmoji: r.iconEmoji,
        lastActivityAt: r.lastActivityAt,
      })),
    };
  }

  /**
   * 홈 페이지용 고정(pinned) 게시글
   */
  async listPinnedPosts(limit = 3) {
    if (this.config.scope === 'community') {
      return this.dataSource.query(`
        SELECT p.id, p.title, COALESCE(u.nickname, u.name) as "authorName", p.created_at as "createdAt", c.name as "categoryName"
        FROM forum_post p
        LEFT JOIN forum_category c ON p."categoryId" = c.id
        LEFT JOIN users u ON p.author_id = u.id
        WHERE p.status = 'publish' AND p."isPinned" = true AND p.organization_id IS NULL
          AND (c.forum_type IS NULL OR c.forum_type != 'closed')
        ORDER BY p.created_at DESC
        LIMIT $1
      `, [limit]);
    }

    // organization scope
    return this.dataSource.query(`
      SELECT p.id, p.title, COALESCE(u.nickname, u.name) as "authorName", p.created_at as "createdAt", c.name as "categoryName"
      FROM forum_post p
      LEFT JOIN forum_category c ON p."categoryId" = c.id
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.status = 'publish' AND p."isPinned" = true AND p.organization_id = $1
        AND (c.forum_type IS NULL OR c.forum_type != 'closed')
      ORDER BY p.created_at DESC
      LIMIT $2
    `, [this.config.organizationId, limit]);
  }
}
