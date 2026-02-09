/**
 * ContentQueryService — APP-CONTENT 공용 쿼리 서비스
 *
 * Phase 2: 서비스별 인라인 CMS 쿼리를 공통 서비스로 추출.
 * Phase 3A: 추천/조회수/페이지네이션 지원 추가.
 * KPA, Neture 등 모든 서비스가 동일한 쿼리 로직을 재사용.
 */

import { DataSource, In } from 'typeorm';

export interface ContentQueryConfig {
  serviceKeys: string[];
  defaultTypes?: string[];
}

export interface ContentListParams {
  type?: string;
  sort?: 'latest' | 'featured' | 'views';
  page?: number;
  limit?: number;
}

export interface ContentListWithRecParams extends ContentListParams {
  userId?: string;
}

export class ContentQueryService {
  private repo;

  constructor(
    private dataSource: DataSource,
    private config: ContentQueryConfig,
  ) {
    // ESM entity rule: use string-based reference to avoid circular dependency
    this.repo = dataSource.getRepository('CmsContent');
  }

  /**
   * 공개된 콘텐츠 목록 조회 (페이지네이션 + 정렬 + 타입 필터)
   */
  async listPublished(params: ContentListParams = {}) {
    const { type, sort = 'latest', page = 1, limit = 20 } = params;

    const where: any = {
      serviceKey: In(this.config.serviceKeys),
      status: 'published',
    };

    if (type) {
      where.type = type;
    } else if (this.config.defaultTypes?.length) {
      where.type = In(this.config.defaultTypes);
    }

    let order: any;
    switch (sort) {
      case 'featured':
        order = { isPinned: 'DESC', isOperatorPicked: 'DESC', sortOrder: 'ASC', createdAt: 'DESC' };
        break;
      case 'views':
        order = { isPinned: 'DESC', viewCount: 'DESC', createdAt: 'DESC' };
        break;
      default: // 'latest'
        order = { isPinned: 'DESC', createdAt: 'DESC' };
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      order,
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: data.map((c: any) => this.toListItem(c)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * 공개된 콘텐츠 목록 + 추천 정보 enrichment
   * Phase 3A: batch query로 N+1 방지
   */
  async listPublishedWithRecommendations(params: ContentListWithRecParams = {}) {
    const { userId, ...listParams } = params;
    const result = await this.listPublished(listParams);

    if (result.data.length === 0) {
      return result;
    }

    const contentIds = result.data.map(d => d.id);

    // Batch: 추천수 조회
    const recCounts = await this.safeRecQuery<{ content_id: string; count: string }>(
      `SELECT content_id, COUNT(*) as count
       FROM cms_content_recommendations
       WHERE content_id = ANY($1)
       GROUP BY content_id`,
      [contentIds],
    );
    const countMap = new Map(recCounts.map(r => [r.content_id, parseInt(r.count)]));

    // Batch: 내 추천 여부
    let userRecSet = new Set<string>();
    if (userId) {
      const userRecs = await this.safeRecQuery<{ content_id: string }>(
        `SELECT content_id FROM cms_content_recommendations
         WHERE content_id = ANY($1) AND user_id = $2`,
        [contentIds, userId],
      );
      userRecSet = new Set(userRecs.map(r => r.content_id));
    }

    return {
      ...result,
      data: result.data.map(item => ({
        ...item,
        recommendCount: countMap.get(item.id) || 0,
        isRecommendedByMe: userRecSet.has(item.id),
      })),
    };
  }

  /**
   * 단일 콘텐츠 상세 조회 (서비스 키 범위 내)
   */
  async getById(id: string) {
    const content = await this.repo.findOne({
      where: { id, serviceKey: In(this.config.serviceKeys) },
    });
    if (!content) return null;
    return this.toDetail(content as any);
  }

  /**
   * 단일 콘텐츠 상세 + 추천 정보
   */
  async getByIdWithRecommendations(id: string, userId?: string) {
    const content = await this.getById(id);
    if (!content) return null;

    const recCountResult = await this.safeRecQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM cms_content_recommendations WHERE content_id = $1`,
      [id],
    );
    const recommendCount = parseInt(recCountResult[0]?.count || '0');

    let isRecommendedByMe = false;
    if (userId) {
      const userRec = await this.safeRecQuery<{ content_id: string }>(
        `SELECT 1 as content_id FROM cms_content_recommendations WHERE content_id = $1 AND user_id = $2 LIMIT 1`,
        [id, userId],
      );
      isRecommendedByMe = userRec.length > 0;
    }

    return { ...content, recommendCount, isRecommendedByMe };
  }

  /**
   * 조회수 증가 (atomic increment)
   */
  async incrementViewCount(id: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE cms_contents SET "viewCount" = "viewCount" + 1 WHERE id = $1`,
      [id],
    );
  }

  /**
   * 추천 토글 (INSERT ↔ DELETE)
   * 이미 추천했으면 취소, 아니면 추천
   */
  async toggleRecommendation(contentId: string, userId: string) {
    // 테이블 존재 여부 graceful check
    const tableCheck = await this.dataSource.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'cms_content_recommendations') AS "exists"`,
    );
    if (!tableCheck[0]?.exists) {
      return { recommendCount: 0, isRecommendedByMe: false };
    }

    // 기존 추천 확인
    const existing = await this.dataSource.query(
      `SELECT id FROM cms_content_recommendations WHERE content_id = $1 AND user_id = $2`,
      [contentId, userId],
    );

    let isRecommendedByMe: boolean;
    if (existing.length > 0) {
      // 추천 취소
      await this.dataSource.query(
        `DELETE FROM cms_content_recommendations WHERE content_id = $1 AND user_id = $2`,
        [contentId, userId],
      );
      isRecommendedByMe = false;
    } else {
      // 추천 추가
      await this.dataSource.query(
        `INSERT INTO cms_content_recommendations (content_id, user_id) VALUES ($1, $2)`,
        [contentId, userId],
      );
      isRecommendedByMe = true;
    }

    // 업데이트된 카운트
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM cms_content_recommendations WHERE content_id = $1`,
      [contentId],
    );
    const recommendCount = parseInt(countResult[0]?.count || '0');

    return { recommendCount, isRecommendedByMe };
  }

  /**
   * 홈 페이지용 콘텐츠 목록 (특정 타입, 제한 개수)
   */
  async listForHome(types: string[], limit: number) {
    const data = await this.repo.find({
      where: {
        serviceKey: In(this.config.serviceKeys),
        type: In(types) as any,
        status: 'published' as any,
      },
      order: { isPinned: 'DESC', sortOrder: 'ASC', createdAt: 'DESC' },
      take: limit,
    });
    return data.map((c: any) => this.toListItem(c));
  }

  /**
   * 추천 콘텐츠 목록 (isOperatorPicked 우선)
   */
  async listFeatured(types: string[], limit: number) {
    const data = await this.repo.find({
      where: {
        serviceKey: In(this.config.serviceKeys),
        type: In(types) as any,
        status: 'published' as any,
      },
      order: { isOperatorPicked: 'DESC', sortOrder: 'ASC', createdAt: 'DESC' },
      take: limit,
    });
    return data.map((c: any) => this.toListItem(c));
  }

  private toListItem(c: any) {
    return {
      id: c.id,
      type: c.type,
      title: c.title,
      summary: c.summary,
      imageUrl: c.imageUrl,
      linkUrl: c.linkUrl,
      isPinned: c.isPinned,
      isOperatorPicked: c.isOperatorPicked,
      metadata: c.metadata,
      publishedAt: c.publishedAt,
      createdAt: c.createdAt,
      viewCount: c.viewCount || 0,
    };
  }

  private toDetail(c: any) {
    return {
      ...this.toListItem(c),
      body: c.body,
      linkText: c.linkText,
    };
  }

  /**
   * cms_content_recommendations 테이블이 아직 없을 때 빈 배열 반환
   */
  private async safeRecQuery<T>(sql: string, params: any[]): Promise<T[]> {
    try {
      return await this.dataSource.query(sql, params);
    } catch (error: any) {
      // 테이블 미존재 시 graceful fallback
      if (error.message?.includes('cms_content_recommendations') && error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }
}
