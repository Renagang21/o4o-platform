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
   */
  async listForumHub() {
    if (this.config.scope === 'community') {
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
        WHERE c."isActive" = true AND c.organization_id IS NULL
        GROUP BY c.id
        ORDER BY c."isPinned" DESC, c."sortOrder" ASC, MAX(p.created_at) DESC NULLS LAST
      `);
    }

    // organization scope
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
      WHERE c."isActive" = true AND c.organization_id = $1
      GROUP BY c.id
      ORDER BY c."isPinned" DESC, c."sortOrder" ASC, MAX(p.created_at) DESC NULLS LAST
    `, [this.config.organizationId]);
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
