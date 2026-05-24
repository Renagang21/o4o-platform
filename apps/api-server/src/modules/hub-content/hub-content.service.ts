/**
 * HubContentQueryService — HUB 통합 콘텐츠 조회 서비스
 *
 * WO-O4O-HUB-CONTENT-QUERY-SERVICE-PHASE1-V2
 * IR-O4O-PLATFORM-CONTENT-POLICY-FINAL-V1 3축 모델 기준
 *
 * CMS + Signage 콘텐츠를 통합 조회하여 HubContentItemResponse로 반환.
 * Producer 매핑은 서버에서 수행 (클라이언트 신뢰하지 않음).
 */

import { DataSource, In } from 'typeorm';
import type {
  HubProducer,
  HubSourceDomain,
  HubContentItemResponse,
  HubContentListResponse,
} from '@o4o/types/hub-content';

// ============================================
// Producer ↔ Domain 매핑 (서버 내부 전용)
// IR-O4O-PLATFORM-CONTENT-POLICY-FINAL-V1 §3
// ============================================

const PRODUCER_TO_AUTHOR_ROLES: Record<HubProducer, string[]> = {
  operator: ['admin', 'service_admin'],
  supplier: ['supplier'],
  community: ['community'],
  store: [],  // KpaStoreContent는 별도 조회 — queryCms에서 사용 안 함
};

const PRODUCER_TO_SIGNAGE_SOURCE: Record<HubProducer, string> = {
  operator: 'hq',
  supplier: 'supplier',
  community: 'community',
  store: '',  // KpaStoreContent는 별도 조회 — querySignage에서 사용 안 함
};

const AUTHOR_ROLE_TO_PRODUCER: Record<string, HubProducer> = {
  admin: 'operator',
  service_admin: 'operator',
  supplier: 'supplier',
  community: 'community',
};

const SIGNAGE_SOURCE_TO_PRODUCER: Record<string, HubProducer> = {
  hq: 'operator',
  supplier: 'supplier',
  community: 'community',
};

// ============================================
// Query parameters
// ============================================

export interface HubContentQueryParams {
  serviceKey: string;
  producer?: HubProducer;
  sourceDomain?: HubSourceDomain;
  page?: number;
  limit?: number;
}

// ============================================
// Service
// ============================================

const MAX_FETCH_PER_DOMAIN = 100;

export class HubContentQueryService {
  constructor(private dataSource: DataSource) {}

  async getContents(params: HubContentQueryParams): Promise<HubContentListResponse> {
    const {
      serviceKey,
      producer,
      sourceDomain,
      page = 1,
      limit = 20,
    } = params;

    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);

    // Single-domain mode: SQL-level pagination
    if (sourceDomain) {
      return this.querySingleDomain(serviceKey, sourceDomain, producer, safePage, safeLimit);
    }

    // Mixed mode: fetch from each domain, merge in memory
    return this.queryMixed(serviceKey, producer, safePage, safeLimit);
  }

  // ── Single-domain (SQL pagination) ──

  private async querySingleDomain(
    serviceKey: string,
    domain: HubSourceDomain,
    producer: HubProducer | undefined,
    page: number,
    limit: number,
  ): Promise<HubContentListResponse> {
    switch (domain) {
      case 'cms':
        return this.queryCms(serviceKey, producer, page, limit);
      case 'signage-media':
        return this.querySignageMedia(serviceKey, producer, page, limit);
      case 'signage-playlist':
        return this.querySignagePlaylists(serviceKey, producer, page, limit);
      case 'blog':
        return this.queryBlog(serviceKey, producer, page, limit);
      case 'pop':
        return this.queryPop(serviceKey, producer, page, limit);
      // (제거됨) case 'kpa-store-content' — WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1.
      // Store → Community 공유 흐름 폐기로 store-shared 콘텐츠는 HUB 에 노출되지 않는다.
      default:
        return { success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  }

  // ── Blog (Phase 2 — Operator HUB Blog Query) ──
  //
  // WO-O4O-OPERATOR-BLOG-PUBLISHING-BACKEND-QUERY-V1 (2026-05-23):
  //   Phase 2-1 schema 확장 (author_role 컬럼) 위에서 운영자 게시 블로그만 HUB 노출.
  //
  // 조회 조건:
  //   - store_blog_posts.author_role = 'operator'
  //   - store_blog_posts.status = 'published'
  //   - store_blog_posts.service_key = serviceKey  ← cross-service 노출 차단
  //
  // 차단 대상:
  //   - author_role = 'store' (매장 직접 작성 블로그 — 매장 전용 유지)
  //   - 다른 service_key 의 운영자 블로그 (Neture 포함 — Neture 는 매장 기능 없음)
  //
  // producer 인자가 명시되면 'operator' 만 통과 — supplier/community/store 는 빈 응답
  // (Blog 도메인의 유일한 producer 는 'operator' 임).
  //
  // Raw SQL + Parameter Binding (Boundary Policy: Guard Rule 2).
  // 복합 인덱스 IDX_store_blog_posts_hub_query (service_key, author_role, status) 활용.
  private async queryBlog(
    serviceKey: string,
    producer: HubProducer | undefined,
    page: number,
    limit: number,
  ): Promise<HubContentListResponse> {
    if (producer && producer !== 'operator') {
      return { success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    try {
      const offset = (page - 1) * limit;

      const rows = await this.dataSource.query(
        `SELECT id, title, slug, excerpt, status, published_at, created_at, service_key
         FROM store_blog_posts
         WHERE service_key = $1
           AND author_role = 'operator'
           AND status = 'published'
         ORDER BY COALESCE(published_at, created_at) DESC
         LIMIT $2 OFFSET $3`,
        [serviceKey, limit, offset],
      );

      const countRows = await this.dataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM store_blog_posts
         WHERE service_key = $1
           AND author_role = 'operator'
           AND status = 'published'`,
        [serviceKey],
      );

      const total = countRows[0]?.total ?? 0;

      return {
        success: true,
        data: rows.map((r: any) => this.mapBlogItem(r)),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return { success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
      throw error;
    }
  }

  // ── Mixed merge (in-memory) ──

  private async queryMixed(
    serviceKey: string,
    producer: HubProducer | undefined,
    page: number,
    limit: number,
  ): Promise<HubContentListResponse> {
    // WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1:
    //   queryStoreSharedContent 호출 제거. Store → Community 공유 흐름 폐기.
    // WO-O4O-OPERATOR-BLOG-PUBLISHING-BACKEND-QUERY-V1:
    //   queryBlog 추가 — 운영자 게시 블로그 (author_role='operator') 만 통합 목록에 포함.
    // WO-O4O-KPA-POP-PUBLISHING-PHASE2-BACKEND-V1:
    //   queryPop 추가 — 운영자 게시 POP (author_role='operator', status='published') 만
    //   mixed 통합 목록에 포함. Blog 와 동일한 정책.
    const [cms, media, playlists, blog, pop] = await Promise.allSettled([
      this.queryCms(serviceKey, producer, 1, MAX_FETCH_PER_DOMAIN),
      this.querySignageMedia(serviceKey, producer, 1, MAX_FETCH_PER_DOMAIN),
      this.querySignagePlaylists(serviceKey, producer, 1, MAX_FETCH_PER_DOMAIN),
      this.queryBlog(serviceKey, producer, 1, MAX_FETCH_PER_DOMAIN),
      this.queryPop(serviceKey, producer, 1, MAX_FETCH_PER_DOMAIN),
    ]);

    const items: HubContentItemResponse[] = [];
    if (cms.status === 'fulfilled') items.push(...cms.value.data);
    if (media.status === 'fulfilled') items.push(...media.value.data);
    if (playlists.status === 'fulfilled') items.push(...playlists.value.data);
    if (blog.status === 'fulfilled') items.push(...blog.value.data);
    if (pop.status === 'fulfilled') items.push(...pop.value.data);

    // Sort: createdAt DESC 기본, 동일 시각일 때 producer 우선순위 tie-break
    // operator(0) > supplier(1) > store(2) > community(3)
    const PRODUCER_PRIORITY: Record<string, number> = {
      operator: 0, supplier: 1, store: 2, community: 3,
    };
    items.sort((a, b) => {
      const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return (PRODUCER_PRIORITY[a.producer] ?? 9) - (PRODUCER_PRIORITY[b.producer] ?? 9);
    });

    const total = items.length;
    const paged = items.slice((page - 1) * limit, page * limit);

    return {
      success: true,
      data: paged,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── CMS ──

  private async queryCms(
    serviceKey: string,
    producer: HubProducer | undefined,
    page: number,
    limit: number,
  ): Promise<HubContentListResponse> {
    // 'store' producer는 KpaStoreContent 전용 — CMS 조회 대상 아님
    if (producer === 'store') {
      return { success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    try {
      const repo = this.dataSource.getRepository('CmsContent');

      const where: any = {
        serviceKey,
        status: 'published',
        visibilityScope: In(['platform', 'service']),
      };

      if (producer) {
        const roles = PRODUCER_TO_AUTHOR_ROLES[producer];
        where.authorRole = roles.length === 1 ? roles[0] : In(roles);
      }

      const [data, total] = await repo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: limit,
        skip: (page - 1) * limit,
      });

      return {
        success: true,
        data: data.map((c: any) => this.mapCmsItem(c)),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return { success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
      throw error;
    }
  }

  // ── Signage Media ──

  private async querySignageMedia(
    serviceKey: string,
    producer: HubProducer | undefined,
    page: number,
    limit: number,
  ): Promise<HubContentListResponse> {
    // 'store' producer는 KpaStoreContent 전용 — Signage 조회 대상 아님
    if (producer === 'store') {
      return { success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    try {
      const offset = (page - 1) * limit;
      const params: any[] = [serviceKey];

      let sourceFilter: string;
      if (producer) {
        sourceFilter = `AND m.source = $2`;
        params.push(PRODUCER_TO_SIGNAGE_SOURCE[producer]);
      } else {
        sourceFilter = `AND m.source IN ($2, $3, $4)`;
        params.push('hq', 'supplier', 'community');
      }

      const limitIdx = params.length + 1;
      const offsetIdx = params.length + 2;
      params.push(limit, offset);

      const media = await this.dataSource.query(`
        SELECT
          m.id, m.name, m."mediaType", m."sourceUrl", m."thumbnailUrl",
          m.duration, m.source, m."createdAt",
          COALESCE(o.name, u.name, u.email) as "creatorName"
        FROM signage_media m
        LEFT JOIN organizations o ON m."organizationId" = o.id
        LEFT JOIN users u ON m."createdByUserId" = u.id
        WHERE m."serviceKey" = $1 ${sourceFilter} AND m.status = 'active'
          AND m.scope = 'global'
        ORDER BY m."createdAt" DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `, params);

      const countParams = params.slice(0, -2);
      const countResult = await this.dataSource.query(`
        SELECT COUNT(*) as total
        FROM signage_media m
        WHERE m."serviceKey" = $1 ${sourceFilter} AND m.status = 'active'
          AND m.scope = 'global'
      `, countParams);

      const total = parseInt(countResult[0]?.total || '0', 10);

      return {
        success: true,
        data: media.map((m: any) => this.mapSignageMedia(m)),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return { success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
      throw error;
    }
  }

  // ── Signage Playlists ──

  private async querySignagePlaylists(
    serviceKey: string,
    producer: HubProducer | undefined,
    page: number,
    limit: number,
  ): Promise<HubContentListResponse> {
    // 'store' producer는 KpaStoreContent 전용 — Signage 조회 대상 아님
    if (producer === 'store') {
      return { success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    try {
      const offset = (page - 1) * limit;
      const params: any[] = [serviceKey];

      let sourceFilter: string;
      if (producer) {
        sourceFilter = `AND p.source = $2`;
        params.push(PRODUCER_TO_SIGNAGE_SOURCE[producer]);
      } else {
        sourceFilter = `AND p.source IN ($2, $3, $4)`;
        params.push('hq', 'supplier', 'community');
      }

      const limitIdx = params.length + 1;
      const offsetIdx = params.length + 2;
      params.push(limit, offset);

      const playlists = await this.dataSource.query(`
        SELECT
          p.id, p.name, p.description, p."itemCount", p."totalDuration",
          p.source, p."createdAt",
          COALESCE(o.name, u.name, u.email) as "creatorName"
        FROM signage_playlists p
        LEFT JOIN organizations o ON p."organizationId" = o.id
        LEFT JOIN users u ON p."createdByUserId" = u.id
        WHERE p."serviceKey" = $1 ${sourceFilter} AND p.status = 'active'
          AND p.scope = 'global'
        ORDER BY p."createdAt" DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `, params);

      const countParams = params.slice(0, -2);
      const countResult = await this.dataSource.query(`
        SELECT COUNT(*) as total
        FROM signage_playlists p
        WHERE p."serviceKey" = $1 ${sourceFilter} AND p.status = 'active'
          AND p.scope = 'global'
      `, countParams);

      const total = parseInt(countResult[0]?.total || '0', 10);

      return {
        success: true,
        data: playlists.map((p: any) => this.mapSignagePlaylist(p)),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return { success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
      throw error;
    }
  }

  // (제거됨) queryStoreSharedContent 메서드
  // WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1
  // Store → Community 공유 흐름 폐기. share_status='approved' KpaStoreContent 를
  // HUB 통합 응답에 포함하던 로직 제거. 매장 콘텐츠는 매장 전용으로 유지된다.

  // ── Mappers ──

  private mapCmsItem(c: any): HubContentItemResponse {
    const role = c.authorRole || 'admin';
    return {
      id: c.id,
      sourceDomain: 'cms',
      producer: AUTHOR_ROLE_TO_PRODUCER[role] || 'operator',
      title: c.title,
      description: c.summary ?? null,
      thumbnailUrl: c.imageUrl ?? null,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
      cmsType: c.type,
      imageUrl: c.imageUrl ?? null,
      linkUrl: c.linkUrl ?? null,
      authorRole: role,
      visibilityScope: c.visibilityScope || 'platform',
      isPinned: c.isPinned ?? false,
    };
  }

  private mapSignageMedia(m: any): HubContentItemResponse {
    return {
      id: m.id,
      sourceDomain: 'signage-media',
      producer: SIGNAGE_SOURCE_TO_PRODUCER[m.source] || 'operator',
      title: m.name,
      description: null,
      thumbnailUrl: m.thumbnailUrl ?? null,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
      mediaType: m.mediaType,
      sourceUrl: m.sourceUrl ?? null,
      duration: m.duration ?? null,
      source: m.source,
      creatorName: m.creatorName ?? null,
    };
  }

  private mapSignagePlaylist(p: any): HubContentItemResponse {
    return {
      id: p.id,
      sourceDomain: 'signage-playlist',
      producer: SIGNAGE_SOURCE_TO_PRODUCER[p.source] || 'operator',
      title: p.name,
      description: p.description ?? null,
      thumbnailUrl: null,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
      source: p.source,
      itemCount: p.itemCount ?? 0,
      totalDuration: p.totalDuration ?? 0,
      creatorName: p.creatorName ?? null,
    };
  }

  // ── POP (Phase 2 — Operator HUB POP Query) ──
  //
  // WO-O4O-KPA-POP-PUBLISHING-PHASE2-BACKEND-V1 (2026-05-24):
  //   Phase 1 placeholder 를 실 조회로 전환. queryBlog 패턴 그대로 mirror — store_pops 와
  //   store_blog_posts 의 스키마 형태가 동일하기 때문.
  //
  // 조회 조건:
  //   - store_pops.author_role = 'operator'   (매장 직접 작성 POP 차단 — 매장 전용 유지)
  //   - store_pops.status = 'published'       (draft/archived 차단)
  //   - store_pops.service_key = serviceKey   (cross-service 노출 차단)
  //
  // producer 인자가 명시되면 'operator' 만 통과 — supplier/community/store 는 빈 응답
  // (POP 도메인의 유일한 HUB producer 는 'operator' 임).
  //
  // Raw SQL + Parameter Binding (Boundary Policy: Guard Rule 2).
  // 복합 인덱스 IDX_store_pops_hub_query (service_key, author_role, status) 활용.
  private async queryPop(
    serviceKey: string,
    producer: HubProducer | undefined,
    page: number,
    limit: number,
  ): Promise<HubContentListResponse> {
    if (producer && producer !== 'operator') {
      return { success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    try {
      const offset = (page - 1) * limit;

      const rows = await this.dataSource.query(
        `SELECT id, title, slug, excerpt, status, published_at, created_at, service_key
         FROM store_pops
         WHERE service_key = $1
           AND author_role = 'operator'
           AND status = 'published'
         ORDER BY COALESCE(published_at, created_at) DESC
         LIMIT $2 OFFSET $3`,
        [serviceKey, limit, offset],
      );

      const countRows = await this.dataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM store_pops
         WHERE service_key = $1
           AND author_role = 'operator'
           AND status = 'published'`,
        [serviceKey],
      );

      const total = countRows[0]?.total ?? 0;

      return {
        success: true,
        data: rows.map((r: any) => this.mapPopItem(r)),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return { success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
      throw error;
    }
  }

  // WO-O4O-KPA-POP-PUBLISHING-PHASE2-BACKEND-V1:
  //   store_pops row → HubContentItemResponse 매퍼. mapBlogItem mirror.
  //   producer 는 항상 'operator' (queryPop 가 author_role='operator' 만 통과시킴).
  //   thumbnailUrl 은 store_pops 스키마에 thumbnail 컬럼이 없어 null — 향후 확장 시 추가.
  private mapPopItem(p: any): HubContentItemResponse {
    const createdAtRaw = p.published_at ?? p.created_at;
    return {
      id: p.id,
      sourceDomain: 'pop',
      producer: 'operator',
      title: p.title,
      description: p.excerpt ?? null,
      thumbnailUrl: null,
      createdAt: createdAtRaw instanceof Date ? createdAtRaw.toISOString() : String(createdAtRaw),
      authorRole: 'operator',
    };
  }

  // WO-O4O-OPERATOR-BLOG-PUBLISHING-BACKEND-QUERY-V1:
  //   store_blog_posts row → HubContentItemResponse 매퍼.
  //   producer 는 항상 'operator' (queryBlog 가 author_role='operator' 만 통과시킴).
  //   thumbnailUrl 은 현재 schema 에 thumbnail 컬럼이 없어 null — 향후 확장 시 추가.
  private mapBlogItem(b: any): HubContentItemResponse {
    const createdAtRaw = b.published_at ?? b.created_at;
    return {
      id: b.id,
      sourceDomain: 'blog',
      producer: 'operator',
      title: b.title,
      description: b.excerpt ?? null,
      thumbnailUrl: null,
      createdAt: createdAtRaw instanceof Date ? createdAtRaw.toISOString() : String(createdAtRaw),
      authorRole: 'operator',
    };
  }

  // (제거됨) mapStoreContentItem — WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1.
  // queryStoreSharedContent 와 함께 폐기.
}
