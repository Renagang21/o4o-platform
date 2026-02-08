/**
 * ContentQueryService — APP-CONTENT 공용 쿼리 서비스
 *
 * Phase 2: 서비스별 인라인 CMS 쿼리를 공통 서비스로 추출.
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
      default: // 'latest', 'views' (viewCount TBD)
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
    };
  }

  private toDetail(c: any) {
    return {
      ...this.toListItem(c),
      body: c.body,
      linkText: c.linkText,
    };
  }
}
