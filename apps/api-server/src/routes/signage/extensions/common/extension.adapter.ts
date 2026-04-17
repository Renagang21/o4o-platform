/**
 * Signage Extension - Core Adapter Layer
 *
 * WO-SIGNAGE-PHASE3-DEV-FOUNDATION
 *
 * Extension에서 Core API를 직접 호출하지 않고
 * 이 Adapter를 통해 Core 기능에 접근
 *
 * 제공 기능:
 * - Global Content 조회
 * - Force Content 적용 여부 판단
 * - Media 접근
 *
 * 제거됨 (WO-KPA-SIGNAGE-RESIDUAL-CODE-ALIGNMENT-V1):
 * - Playlist Clone / Media Clone → asset-snapshot-copy 경로로 대체됨
 */

import type { DataSource } from 'typeorm';
import type {
  ExtensionType,
  ExtensionContentSource,
  ExtensionGlobalContentItem,
} from './extension.types.js';
import { FORCE_ALLOWED_SOURCES, CORE_CONTENT_SOURCES } from './extension.types.js';
import { canForceContent } from './extension.config.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Core Service Scope
 */
interface CoreScope {
  serviceKey: string;
  organizationId?: string;
}

/**
 * Global Content Query Options
 */
interface GlobalContentQueryOptions {
  source?: string;
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isForced?: boolean;
}


/**
 * Core Playlist Response (from Core Service)
 */
interface CorePlaylistResponse {
  id: string;
  name: string;
  description?: string | null;
  source?: string;
  scope?: string;
  isForced?: boolean;
  status: string;
  itemCount: number;
  totalDuration: number;
  thumbnailUrl?: string | null;
  createdAt?: string;
  parentPlaylistId?: string | null;
}

/**
 * Core Media Response (from Core Service)
 */
interface CoreMediaResponse {
  id: string;
  name: string;
  description?: string | null;
  mediaType: string;
  sourceUrl: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  source?: string;
  scope?: string;
  createdAt?: string;
  parentMediaId?: string | null;
}

// ============================================================================
// CORE EXTENSION ADAPTER
// ============================================================================

/**
 * Core Extension Adapter
 *
 * Extension이 Core 기능에 접근하기 위한 Adapter
 * Core Service를 직접 참조하지 않고 DataSource를 통해 접근
 */
export class CoreExtensionAdapter {
  private dataSource: DataSource;
  private extensionType: ExtensionType;

  constructor(dataSource: DataSource, extensionType: ExtensionType) {
    this.dataSource = dataSource;
    this.extensionType = extensionType;
  }

  // ========== GLOBAL CONTENT READ ==========

  /**
   * Core Global Playlists 조회
   *
   * Extension에서 Core의 Global Content를 조회할 때 사용
   * Core sources (hq, supplier, community)만 반환
   */
  async getCoreGlobalPlaylists(
    scope: CoreScope,
    options: GlobalContentQueryOptions = {},
  ): Promise<{ data: ExtensionGlobalContentItem[]; total: number }> {
    const { source, page = 1, limit = 20, search, isForced } = options;

    // Core sources만 허용
    const validSource = source && CORE_CONTENT_SOURCES.includes(source as any) ? source : undefined;

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select([
        'p.id as id',
        'p.name as title',
        'p.description as description',
        'p.source as source',
        'p.scope as scope',
        "COALESCE(p.is_forced, false) as \"isForced\"",
        'p.status as status',
        'p.thumbnail_url as "thumbnailUrl"',
        'p.created_at as "createdAt"',
      ])
      .from('signage_playlists', 'p')
      .where('p.service_key = :serviceKey', { serviceKey: scope.serviceKey })
      .andWhere('p.scope = :scope', { scope: 'global' })
      .andWhere('p.deleted_at IS NULL');

    // Core sources만 필터
    if (validSource) {
      queryBuilder.andWhere('p.source = :source', { source: validSource });
    } else {
      queryBuilder.andWhere('p.source IN (:...sources)', { sources: CORE_CONTENT_SOURCES });
    }

    if (search) {
      queryBuilder.andWhere('(p.name ILIKE :search OR p.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (isForced !== undefined) {
      queryBuilder.andWhere('p.is_forced = :isForced', { isForced });
    }

    // Count
    const total = await queryBuilder.getCount();

    // Paginate
    queryBuilder
      .orderBy('p.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const rawResults = await queryBuilder.getRawMany();

    const data: ExtensionGlobalContentItem[] = rawResults.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      source: row.source,
      scope: row.scope,
      isForced: row.isForced === true || row.isForced === 'true',
      canClone: !(row.isForced === true || row.isForced === 'true'),
      thumbnailUrl: row.thumbnailUrl,
      createdAt: row.createdAt,
      contentType: 'playlist',
    }));

    return { data, total };
  }

  /**
   * Core Global Media 조회
   */
  async getCoreGlobalMedia(
    scope: CoreScope,
    options: GlobalContentQueryOptions = {},
  ): Promise<{ data: ExtensionGlobalContentItem[]; total: number }> {
    const { source, page = 1, limit = 20, search, category } = options;

    const validSource = source && CORE_CONTENT_SOURCES.includes(source as any) ? source : undefined;

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select([
        'm.id as id',
        'm.name as title',
        'm.description as description',
        'm.source as source',
        'm.scope as scope',
        'm.thumbnail_url as "thumbnailUrl"',
        'm.created_at as "createdAt"',
        'm.media_type as "mediaType"',
      ])
      .from('signage_media', 'm')
      .where('m.service_key = :serviceKey', { serviceKey: scope.serviceKey })
      .andWhere('m.scope = :scope', { scope: 'global' })
      .andWhere('m.deleted_at IS NULL');

    if (validSource) {
      queryBuilder.andWhere('m.source = :source', { source: validSource });
    } else {
      queryBuilder.andWhere('m.source IN (:...sources)', { sources: CORE_CONTENT_SOURCES });
    }

    if (search) {
      queryBuilder.andWhere('(m.name ILIKE :search OR m.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (category) {
      queryBuilder.andWhere('m.category = :category', { category });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('m.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const rawResults = await queryBuilder.getRawMany();

    const data: ExtensionGlobalContentItem[] = rawResults.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      source: row.source,
      scope: row.scope,
      isForced: false, // Media는 Force 개념 없음
      canClone: true,
      thumbnailUrl: row.thumbnailUrl,
      createdAt: row.createdAt,
      contentType: 'media',
    }));

    return { data, total };
  }

  // ========== FORCE CONTENT CHECK ==========

  /**
   * Extension Source가 Force 가능한지 확인
   */
  canSourceForceContent(source: ExtensionContentSource): boolean {
    // Extension-level Force 허용 여부
    if (!canForceContent(this.extensionType)) {
      return false;
    }

    // Source-level Force 허용 여부
    return FORCE_ALLOWED_SOURCES.includes(source);
  }

  /**
   * Force Content 목록 조회 (Player Merge용)
   *
   * Core + Extension의 모든 Forced Content 반환
   * Merge 순서: Core Forced → Extension Forced
   */
  async getForcedContent(
    scope: CoreScope,
    extensionSources?: ExtensionContentSource[],
  ): Promise<ExtensionGlobalContentItem[]> {
    const results: ExtensionGlobalContentItem[] = [];

    // 1. Core Forced Content (hq)
    const coreForced = await this.dataSource
      .createQueryBuilder()
      .select([
        'p.id as id',
        'p.name as title',
        'p.source as source',
        'p.scope as scope',
        "'playlist' as \"contentType\"",
      ])
      .from('signage_playlists', 'p')
      .where('p.service_key = :serviceKey', { serviceKey: scope.serviceKey })
      .andWhere('p.is_forced = true')
      .andWhere('p.source = :source', { source: 'hq' })
      .andWhere('p.deleted_at IS NULL')
      .orderBy('p.created_at', 'ASC')
      .getRawMany();

    results.push(
      ...coreForced.map(row => ({
        id: row.id,
        title: row.title,
        source: row.source,
        scope: row.scope,
        isForced: true,
        canClone: false,
        createdAt: row.createdAt,
        contentType: 'playlist' as const,
      })),
    );

    // 2. Extension Forced Content (pharmacy-hq 등)
    if (extensionSources && extensionSources.length > 0) {
      const forceSources = extensionSources.filter(s => FORCE_ALLOWED_SOURCES.includes(s));

      if (forceSources.length > 0) {
        const extForced = await this.dataSource
          .createQueryBuilder()
          .select([
            'p.id as id',
            'p.name as title',
            'p.source as source',
            'p.scope as scope',
            "'playlist' as \"contentType\"",
          ])
          .from('signage_playlists', 'p')
          .where('p.service_key = :serviceKey', { serviceKey: scope.serviceKey })
          .andWhere('p.is_forced = true')
          .andWhere('p.source IN (:...sources)', { sources: forceSources })
          .andWhere('p.deleted_at IS NULL')
          .orderBy('p.created_at', 'ASC')
          .getRawMany();

        results.push(
          ...extForced.map(row => ({
            id: row.id,
            title: row.title,
            source: row.source,
            scope: row.scope,
            isForced: true,
            canClone: false,
            createdAt: row.createdAt,
            contentType: 'playlist' as const,
          })),
        );
      }
    }

    return results;
  }

}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Extension용 Core Adapter 생성
 */
export function createCoreAdapter(
  dataSource: DataSource,
  extensionType: ExtensionType,
): CoreExtensionAdapter {
  return new CoreExtensionAdapter(dataSource, extensionType);
}
