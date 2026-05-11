/**
 * Asset Copy Service
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 *
 * Platform-level service for copying assets into snapshots.
 * No service-specific imports — uses ContentResolver for source data.
 *
 * Handles:
 * - Copy via Resolver → o4o_asset_snapshots
 * - List snapshots for a given organization
 * - Duplicate detection (app-level + DB unique constraint)
 */

import { DataSource, Repository } from 'typeorm';
import { AssetSnapshot } from '../entities/asset-snapshot.entity.js';
import type { ContentResolver } from '../interfaces/content-resolver.interface.js';
import type { PermissionChecker } from '../interfaces/permission-checker.interface.js';
import { DefaultPermissionChecker } from '../interfaces/permission-checker.interface.js';

export interface CopyAssetInput {
  sourceService: string;
  sourceAssetId: string;
  assetType: string;
  targetOrganizationId: string;
  createdBy: string;
}

export interface CopyResolvedInput {
  sourceService: string;
  sourceAssetId: string;
  assetType: string;
  targetOrganizationId: string;
  createdBy: string;
  title: string;
  contentJson: Record<string, unknown>;
}

export interface CopyResult {
  snapshot: AssetSnapshot;
}

export interface ListOptions {
  assetType?: string;
  page: number;
  limit: number;
  // WO-O4O-STORE-LIBRARY-SERVER-PAGINATION-V1: title 기준 server-side 검색
  search?: string;
}

export interface PaginatedResult {
  items: AssetSnapshot[];
  total: number;
  page: number;
  limit: number;
  // WO-O4O-STORE-LIBRARY-SERVER-PAGINATION-V1: 프론트 Pagination 컴포넌트가 직접 사용
  totalPages: number;
}

export class AssetCopyService {
  private snapshotRepo: Repository<AssetSnapshot>;
  private permissionChecker: PermissionChecker;

  constructor(
    private dataSource: DataSource,
    permissionChecker?: PermissionChecker,
  ) {
    this.snapshotRepo = dataSource.getRepository(AssetSnapshot);
    this.permissionChecker = permissionChecker ?? new DefaultPermissionChecker();
  }

  /**
   * Check if user has any of the allowed roles.
   * Delegates to the injected PermissionChecker.
   */
  checkPermission(userRoles: string[], allowedRoles: string[]): boolean {
    return this.permissionChecker.hasAnyRole(userRoles, allowedRoles);
  }

  /**
   * Copy using a service-specific Resolver.
   * The controller passes a resolver; this service calls it to get content,
   * then stores the snapshot. The service never knows the source structure.
   */
  async copyWithResolver(
    input: CopyAssetInput,
    resolver: ContentResolver,
  ): Promise<CopyResult> {
    const { sourceService, sourceAssetId, assetType, targetOrganizationId, createdBy } = input;

    const resolved = await resolver.resolve(sourceAssetId, assetType);
    if (!resolved) {
      throw new Error('SOURCE_NOT_FOUND');
    }

    return this.copyResolved({
      sourceService,
      sourceAssetId,
      assetType,
      targetOrganizationId,
      createdBy,
      title: resolved.title,
      contentJson: resolved.contentJson,
    });
  }

  /**
   * Store a pre-resolved asset as a snapshot.
   * Used by copyWithResolver and available for direct use.
   */
  async copyResolved(input: CopyResolvedInput): Promise<CopyResult> {
    const { sourceService, sourceAssetId, assetType, targetOrganizationId, createdBy, title, contentJson } = input;

    // WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1
    // Community → My Library 흐름은 완전 복사 기반 — 동일 원본을 여러 번 복사 가능.
    // 각 호출은 새 snapshot 을 생성하며, sourceAssetId 연결은 통계/출처 메타데이터로만 유지된다.
    // (DB 의 UQ_asset_snapshot_org_source_type 도 동일 WO 의 follow-up migration 으로 제거됨.)

    // Validate content_json is a proper object
    if (!contentJson || typeof contentJson !== 'object' || Array.isArray(contentJson)) {
      throw new Error('INVALID_CONTENT');
    }

    const snapshot = this.snapshotRepo.create({
      organizationId: targetOrganizationId,
      sourceService,
      sourceAssetId,
      assetType,
      title: title || 'Untitled',
      contentJson,
      createdBy,
    });

    const saved = await this.snapshotRepo.save(snapshot);
    return { snapshot: saved };
  }

  /**
   * Delete a snapshot owned by the given organization.
   * Throws 'NOT_FOUND' if the snapshot does not exist or does not belong to the org.
   */
  async deleteById(id: string, organizationId: string): Promise<void> {
    const snapshot = await this.snapshotRepo.findOne({
      where: { id, organizationId },
    });
    if (!snapshot) {
      throw new Error('NOT_FOUND');
    }
    await this.snapshotRepo.delete({ id });
  }

  /**
   * List snapshots for an organization with pagination.
   * WO-O4O-STORE-LIBRARY-SERVER-PAGINATION-V1: 제목 ILIKE search 지원, totalPages 반환.
   */
  async listByOrganization(
    organizationId: string,
    options: ListOptions,
  ): Promise<PaginatedResult> {
    const { assetType, page, limit, search } = options;
    const qb = this.snapshotRepo
      .createQueryBuilder('s')
      .where('s.organizationId = :organizationId', { organizationId });
    if (assetType) {
      qb.andWhere('s.assetType = :assetType', { assetType });
    }
    const term = search?.trim();
    if (term) {
      qb.andWhere('s.title ILIKE :term', { term: `%${term}%` });
    }
    qb.orderBy('s.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { items, total, page, limit, totalPages };
  }
}
