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
};

const PRODUCER_TO_SIGNAGE_SOURCE: Record<HubProducer, string> = {
  operator: 'hq',
  supplier: 'supplier',
  community: 'community',
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
      default:
        return { success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  }

  // ── Mixed merge (in-memory) ──

  private async queryMixed(
    serviceKey: string,
    producer: HubProducer | undefined,
    page: number,
    limit: number,
  ): Promise<HubContentListResponse> {
    const [cms, media, playlists] = await Promise.allSettled([
      this.queryCms(serviceKey, producer, 1, MAX_FETCH_PER_DOMAIN),
      this.querySignageMedia(serviceKey, producer, 1, MAX_FETCH_PER_DOMAIN),
      this.querySignagePlaylists(serviceKey, producer, 1, MAX_FETCH_PER_DOMAIN),
    ]);

    const items: HubContentItemResponse[] = [];
    if (cms.status === 'fulfilled') items.push(...cms.value.data);
    if (media.status === 'fulfilled') items.push(...media.value.data);
    if (playlists.status === 'fulfilled') items.push(...playlists.value.data);

    // Sort by createdAt DESC
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
}
