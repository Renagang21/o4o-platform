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
        SELECT p.id, p.title, COALESCE(u.nickname, u.name) as "authorName", p.created_at, c.name as "categoryName"
        FROM forum_post p
        LEFT JOIN forum_category c ON p."categoryId" = c.id
        LEFT JOIN users u ON p.author_id = u.id
        WHERE p.status = 'publish' AND p.organization_id IS NULL
        ORDER BY p.created_at DESC
        LIMIT $1
      `, [limit]);
    }

    // organization scope
    return this.dataSource.query(`
      SELECT p.id, p.title, COALESCE(u.nickname, u.name) as "authorName", p.created_at, c.name as "categoryName"
      FROM forum_post p
      LEFT JOIN forum_category c ON p."categoryId" = c.id
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.status = 'publish' AND p.organization_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2
    `, [this.config.organizationId, limit]);
  }

  /**
   * 포럼 허브 — 카테고리별 요약 (멤버 수, 최근 활동, 최근 글 제목)
   * Phase 2: sort(default|recent|popular) + keyword 검색
   */
  async listForumHub(options?: { sort?: string; keyword?: string; userId?: string }) {
    const sort = options?.sort || 'default';
    const keyword = options?.keyword?.trim() || '';
    const userId = options?.userId?.trim() || '';

    // "joined" sort: filter to categories where user authored posts or comments
    if (sort === 'joined' && userId) {
      return this.listForumHubJoined(userId, keyword);
    }

    // Pinned categories always come first, then pinnedOrder, then sort-specific order
    let orderBy: string;
    switch (sort) {
      case 'recent':
        orderBy = 'c."isPinned" DESC, c."pinnedOrder" ASC NULLS LAST, MAX(p.created_at) DESC NULLS LAST';
        break;
      case 'popular':
        orderBy = 'c."isPinned" DESC, c."pinnedOrder" ASC NULLS LAST, c."postCount" DESC';
        break;
      default:
        orderBy = 'c."isPinned" DESC, c."pinnedOrder" ASC NULLS LAST, c."sortOrder" ASC, MAX(p.created_at) DESC NULLS LAST';
    }

    if (this.config.scope === 'community') {
      const params: any[] = [];
      let keywordFilter = '';
      if (keyword) {
        params.push(`%${keyword}%`);
        keywordFilter = `AND c.name ILIKE $${params.length}`;
      }

      return this.dataSource.query(`
        SELECT
          c.id, c.name, c.slug, c.description, c.color, c."iconEmoji",
          c."postCount", c."sortOrder", c."isPinned",
          COUNT(DISTINCT p.author_id)::int as "memberCount",
          MAX(p.created_at) as "lastActivityAt",
          (SELECT p2.title FROM forum_post p2
           WHERE p2."categoryId" = c.id AND p2.status = 'publish'
             AND p2.organization_id IS NULL
           ORDER BY p2.created_at DESC LIMIT 1) as "lastPostTitle"
        FROM forum_category c
        LEFT JOIN forum_post p ON p."categoryId" = c.id
          AND p.status = 'publish' AND p.organization_id IS NULL
        WHERE c."isActive" = true AND c."accessLevel" = 'all' AND c.organization_id IS NULL ${keywordFilter}
        GROUP BY c.id
        ORDER BY ${orderBy}
      `, params);
    }

    // organization scope
    const params: any[] = [this.config.organizationId];
    let keywordFilter = '';
    if (keyword) {
      params.push(`%${keyword}%`);
      keywordFilter = `AND c.name ILIKE $${params.length}`;
    }

    return this.dataSource.query(`
      SELECT
        c.id, c.name, c.slug, c.description, c.color, c."iconEmoji",
        c."postCount", c."sortOrder", c."isPinned",
        COUNT(DISTINCT p.author_id)::int as "memberCount",
        MAX(p.created_at) as "lastActivityAt",
        (SELECT p2.title FROM forum_post p2
         WHERE p2."categoryId" = c.id AND p2.status = 'publish'
           AND p2.organization_id = $1
         ORDER BY p2.created_at DESC LIMIT 1) as "lastPostTitle"
      FROM forum_category c
      LEFT JOIN forum_post p ON p."categoryId" = c.id
        AND p.status = 'publish' AND p.organization_id = $1
      WHERE c."isActive" = true AND c."accessLevel" = 'all' AND c.organization_id = $1 ${keywordFilter}
      GROUP BY c.id
      ORDER BY ${orderBy}
    `, params);
  }

  /**
   * "내가 참여한 포럼" — 사용자가 글 또는 댓글을 작성한 카테고리만 반환
   * Phase 4: CTE로 사용자 참여 카테고리를 먼저 추출 후 동일 허브 쿼리 적용
   */
  private async listForumHubJoined(userId: string, keyword: string) {
    if (this.config.scope === 'community') {
      const params: any[] = [userId];
      let keywordFilter = '';
      if (keyword) {
        params.push(`%${keyword}%`);
        keywordFilter = `AND c.name ILIKE $${params.length}`;
      }

      return this.dataSource.query(`
        WITH my_categories AS (
          SELECT DISTINCT p."categoryId" AS id
          FROM forum_post p
          WHERE p.author_id = $1 AND p.status = 'publish' AND p.organization_id IS NULL
          UNION
          SELECT DISTINCT p."categoryId" AS id
          FROM forum_comment fc
          JOIN forum_post p ON fc."postId" = p.id
          WHERE fc.author_id = $1 AND p.organization_id IS NULL
        )
        SELECT
          c.id, c.name, c.slug, c.description, c.color, c."iconEmoji",
          c."postCount", c."sortOrder", c."isPinned",
          COUNT(DISTINCT p.author_id)::int AS "memberCount",
          MAX(p.created_at) AS "lastActivityAt",
          (SELECT p2.title FROM forum_post p2
           WHERE p2."categoryId" = c.id AND p2.status = 'publish'
             AND p2.organization_id IS NULL
           ORDER BY p2.created_at DESC LIMIT 1) AS "lastPostTitle"
        FROM forum_category c
        INNER JOIN my_categories mc ON mc.id = c.id
        LEFT JOIN forum_post p ON p."categoryId" = c.id
          AND p.status = 'publish' AND p.organization_id IS NULL
        WHERE c."isActive" = true AND c."accessLevel" = 'all' AND c.organization_id IS NULL ${keywordFilter}
        GROUP BY c.id
        ORDER BY MAX(p.created_at) DESC NULLS LAST
      `, params);
    }

    // organization scope
    const params: any[] = [this.config.organizationId, userId];
    let keywordFilter = '';
    if (keyword) {
      params.push(`%${keyword}%`);
      keywordFilter = `AND c.name ILIKE $${params.length}`;
    }

    return this.dataSource.query(`
      WITH my_categories AS (
        SELECT DISTINCT p."categoryId" AS id
        FROM forum_post p
        WHERE p.author_id = $2 AND p.status = 'publish' AND p.organization_id = $1
        UNION
        SELECT DISTINCT p."categoryId" AS id
        FROM forum_comment fc
        JOIN forum_post p ON fc."postId" = p.id
        WHERE fc.author_id = $2 AND p.organization_id = $1
      )
      SELECT
        c.id, c.name, c.slug, c.description, c.color, c."iconEmoji",
        c."postCount", c."sortOrder", c."isPinned",
        COUNT(DISTINCT p.author_id)::int AS "memberCount",
        MAX(p.created_at) AS "lastActivityAt",
        (SELECT p2.title FROM forum_post p2
         WHERE p2."categoryId" = c.id AND p2.status = 'publish'
           AND p2.organization_id = $1
         ORDER BY p2.created_at DESC LIMIT 1) AS "lastPostTitle"
      FROM forum_category c
      INNER JOIN my_categories mc ON mc.id = c.id
      LEFT JOIN forum_post p ON p."categoryId" = c.id
        AND p.status = 'publish' AND p.organization_id = $1
      WHERE c."isActive" = true AND c."accessLevel" = 'all' AND c.organization_id = $1 ${keywordFilter}
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
        WHERE c."isActive" = true AND c."accessLevel" = 'all' AND c.organization_id IS NULL
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
      WHERE c."isActive" = true AND c."accessLevel" = 'all' AND c.organization_id = $2
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
    const scopeFilter = this.config.scope === 'community'
      ? 'p.organization_id IS NULL'
      : `p.organization_id = '${this.config.organizationId}'`;
    const catScopeFilter = this.config.scope === 'community'
      ? 'c.organization_id IS NULL'
      : `c.organization_id = '${this.config.organizationId}'`;
    const commentScopeFilter = this.config.scope === 'community'
      ? 'p.organization_id IS NULL'
      : `p.organization_id = '${this.config.organizationId}'`;

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
      `),
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
      `),
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
      `),
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
        SELECT p.id, p.title, COALESCE(u.nickname, u.name) as "authorName", p.created_at, c.name as "categoryName"
        FROM forum_post p
        LEFT JOIN forum_category c ON p."categoryId" = c.id
        LEFT JOIN users u ON p.author_id = u.id
        WHERE p.status = 'publish' AND p."isPinned" = true AND p.organization_id IS NULL
        ORDER BY p.created_at DESC
        LIMIT $1
      `, [limit]);
    }

    // organization scope
    return this.dataSource.query(`
      SELECT p.id, p.title, COALESCE(u.nickname, u.name) as "authorName", p.created_at, c.name as "categoryName"
      FROM forum_post p
      LEFT JOIN forum_category c ON p."categoryId" = c.id
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.status = 'publish' AND p."isPinned" = true AND p.organization_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2
    `, [this.config.organizationId, limit]);
  }
}
