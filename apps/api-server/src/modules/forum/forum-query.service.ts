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
        SELECT p.id, p.title, u.nickname as "authorName", p.created_at, c.name as "categoryName"
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
      SELECT p.id, p.title, u.nickname as "authorName", p.created_at, c.name as "categoryName"
      FROM forum_post p
      LEFT JOIN forum_category c ON p."categoryId" = c.id
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.status = 'publish' AND p.organization_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2
    `, [this.config.organizationId, limit]);
  }

  /**
   * 홈 페이지용 고정(pinned) 게시글
   */
  async listPinnedPosts(limit = 3) {
    if (this.config.scope === 'community') {
      return this.dataSource.query(`
        SELECT p.id, p.title, u.nickname as "authorName", p.created_at, c.name as "categoryName"
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
      SELECT p.id, p.title, u.nickname as "authorName", p.created_at, c.name as "categoryName"
      FROM forum_post p
      LEFT JOIN forum_category c ON p."categoryId" = c.id
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.status = 'publish' AND p."isPinned" = true AND p.organization_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2
    `, [this.config.organizationId, limit]);
  }
}
