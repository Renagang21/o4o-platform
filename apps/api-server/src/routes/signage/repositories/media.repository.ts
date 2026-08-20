import { DataSource, Repository } from 'typeorm';
import { SignageMedia } from '@o4o-apps/digital-signage-core/entities';
import type { MediaQueryDto, ScopeFilter } from '../dto/index.js';
import { SignageMediaUsageService, type MediaUsageResult } from '../services/media-usage.service.js';

export class SignageMediaRepository {
  private mediaRepo: Repository<SignageMedia>;

  constructor(private dataSource: DataSource) {
    this.mediaRepo = dataSource.getRepository(SignageMedia);
  }

  async findMediaById(id: string, scope: ScopeFilter): Promise<SignageMedia | null> {
    return this.mediaRepo.findOne({
      where: {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
    });
  }

  /**
   * HQ/Global 미디어 조회 (WO-SIGNAGE-DIRECT-REFERENCE-ITEM-V1)
   * organizationId 필터 없이 serviceKey + source='hq' 조건으로 조회.
   * 매장이 복사 없이 HQ 미디어를 플레이리스트에 직접 참조할 때 사용.
   */
  async findGlobalMediaById(id: string, serviceKey: string): Promise<SignageMedia | null> {
    return this.mediaRepo.findOne({
      where: { id, serviceKey, source: 'hq' } as any,
    });
  }

  async findMedia(
    query: MediaQueryDto,
    scope: ScopeFilter,
  ): Promise<{ data: SignageMedia[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.mediaRepo.createQueryBuilder('media');

    qb.where('media.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('media.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
    }

    qb.andWhere('media.deletedAt IS NULL');

    if (query.mediaType) {
      qb.andWhere('media.mediaType = :mediaType', { mediaType: query.mediaType });
    }
    if (query.sourceType) {
      qb.andWhere('media.sourceType = :sourceType', { sourceType: query.sourceType });
    }
    if (query.status) {
      qb.andWhere('media.status = :status', { status: query.status });
    }
    if (query.tags && query.tags.length > 0) {
      qb.andWhere('media.tags && :tags', { tags: query.tags });
    }
    if (query.search) {
      qb.andWhere('(media.name ILIKE :search OR media.description ILIKE :search OR media.tags::text ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`media.${sortBy}`, sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createMedia(data: Partial<SignageMedia>): Promise<SignageMedia> {
    const media = this.mediaRepo.create(data);
    return this.mediaRepo.save(media);
  }

  async updateMedia(
    id: string,
    data: Partial<SignageMedia>,
    scope: ScopeFilter,
  ): Promise<SignageMedia | null> {
    const media = await this.findMediaById(id, scope);
    if (!media) return null;

    Object.assign(media, data);
    return this.mediaRepo.save(media);
  }

  async softDeleteMedia(id: string, scope: ScopeFilter): Promise<boolean> {
    const result = await this.mediaRepo.update(
      {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      { deletedAt: new Date() },
    );
    return (result.affected || 0) > 0;
  }

  /**
   * Hard delete media — WO-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1
   *
   * 사용처 가드 기반 안전 삭제. CASCADE 를 삭제 정책으로 쓰지 않고, 사용 중이면 차단한다.
   *
   * TOCTOU 방지를 위해 단일 트랜잭션에서:
   *   1. media 행 SELECT ... FOR UPDATE (락)
   *   2. 사용처 재계산 (동일 트랜잭션 executor) — 사용 중이면 아무것도 삭제하지 않고 409 반환
   *   3. tags 정리 (명시적; FK CASCADE 와 중복이나 순서 보장)
   *   4. orphan snapshot 만 정리 — store_playlist_items 가 참조하지 않는 것만
   *      (사용 중이 아님이 재확인됐으므로 이 미디어의 signage snapshot 은 전부 orphan)
   *   5. media 물리 삭제 (직접 참조 playlist item 0 개 확인됨 → CASCADE 로 사라지는 실사용 항목 없음)
   *
   * 참고(삭제 대상 아님): signage_analytics.entityId (loose ref, 이력 보존),
   *   signage_forced_content (video_url 독립), signage_schedules (playlist 참조).
   *
   * 파일 스토리지: 현재 미디어는 URL 기반(youtube/vimeo) 또는 외부 버킷 참조이며
   *   기존 삭제 경로에 스토리지 물리 삭제가 없다. atomicity 리스크 회피를 위해 추가하지 않는다.
   */
  async hardDeleteMedia(
    id: string,
    scope: ScopeFilter,
  ): Promise<{ deleted: boolean; code?: string; usage?: MediaUsageResult }> {
    const usageService = new SignageMediaUsageService(this.dataSource);

    return this.dataSource.transaction(async (manager) => {
      // 1. media 행 락 (soft-deleted 포함, deletedAt 미필터). serviceKey/org scope 준수.
      const lockRows: Array<{ id: string }> = await manager.query(
        `SELECT id FROM signage_media
          WHERE id = $1 AND "serviceKey" = $2
            ${scope.organizationId ? 'AND "organizationId" = $3' : ''}
          FOR UPDATE`,
        scope.organizationId ? [id, scope.serviceKey, scope.organizationId] : [id, scope.serviceKey],
      );
      if (!lockRows || lockRows.length === 0) {
        return { deleted: false, code: 'MEDIA_NOT_FOUND' };
      }

      // 2. 트랜잭션 내부 사용처 재계산 (TOCTOU 방지)
      const usage = await usageService.computeUsage(id, manager);
      if (usage.inUse) {
        return { deleted: false, code: 'SIGNAGE_MEDIA_IN_USE', usage };
      }

      // 3. 태그는 signage_media.tags(jsonb 컬럼)에 저장되며 별도 테이블이 없다.
      //    (signage_media_tags 는 migration 20260417100000 에서 dead table 로 DROP 됨)
      //    → media row 삭제로 함께 제거되므로 별도 정리 불필요.

      // 4. orphan snapshot 만 정리 (참조 중 snapshot 은 위 가드로 이미 차단됨 → 여기선 전부 orphan)
      await manager.query(
        `DELETE FROM o4o_asset_snapshots s
          WHERE s.source_asset_id = $1
            AND s.asset_type = 'signage'
            AND NOT EXISTS (
              SELECT 1 FROM store_playlist_items spi WHERE spi.snapshot_id = s.id
            )`,
        [id],
      );

      // 5. media 물리 삭제
      await manager.query(`DELETE FROM signage_media WHERE id = $1`, [id]);

      return { deleted: true };
    });
  }

  async findMediaLibrary(
    scope: ScopeFilter,
    mediaType?: string,
    _category?: string,
    search?: string,
    limit: number = 50,
  ): Promise<{
    platform: SignageMedia[];
    organization: SignageMedia[];
  }> {
    // WO-O4O-SIGNAGE-MEDIA-LIBRARY-ROUTE-SHADOWING-AND-GUARD-CONTRACT-V1
    // `qb.where()` 는 TypeORM 에서 기존 WHERE 를 **전부 덮어쓴다**.
    // 이전 구현은 여기서 `where()` 를 호출해 앞서 건 serviceKey / organizationId
    // 경계 필터를 지워버렸다 (CLAUDE.md §7 Guard Rule 3 위반 · 전 tenant 노출).
    // 공통 조건은 반드시 `andWhere()` 로만 덧붙인다.
    const baseQuery = (qb: any) => {
      qb.andWhere('media.deletedAt IS NULL');
      qb.andWhere('media.status = :status', { status: 'active' });
      if (mediaType) {
        qb.andWhere('media.mediaType = :mediaType', { mediaType });
      }
      if (search) {
        qb.andWhere('(media.name ILIKE :search OR media.description ILIKE :search OR media.tags::text ILIKE :search)', {
          search: `%${search}%`,
        });
      }
      qb.orderBy('media.createdAt', 'DESC');
      qb.take(limit);
    };

    const platformQb = this.mediaRepo.createQueryBuilder('media');
    platformQb.where('media.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    platformQb.andWhere('media.organizationId IS NULL');
    baseQuery(platformQb);
    const platform = await platformQb.getMany();

    let organization: SignageMedia[] = [];
    if (scope.organizationId) {
      const orgQb = this.mediaRepo.createQueryBuilder('media');
      orgQb.where('media.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
      orgQb.andWhere('media.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
      baseQuery(orgQb);
      organization = await orgQb.getMany();
    }

    return { platform, organization };
  }
}
