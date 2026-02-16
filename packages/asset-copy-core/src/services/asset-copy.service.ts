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
}

export interface PaginatedResult {
  items: AssetSnapshot[];
  total: number;
  page: number;
  limit: number;
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

    // Check duplicate: same org + source + type
    const existing = await this.snapshotRepo.findOne({
      where: { organizationId: targetOrganizationId, sourceAssetId, assetType },
    });
    if (existing) {
      throw new Error('DUPLICATE_SNAPSHOT');
    }

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

    try {
      const saved = await this.snapshotRepo.save(snapshot);
      return { snapshot: saved };
    } catch (err: any) {
      // DB unique constraint violation → treat as duplicate
      if (err.code === '23505') {
        throw new Error('DUPLICATE_SNAPSHOT');
      }
      throw err;
    }
  }

  /**
   * List snapshots for an organization with pagination
   */
  async listByOrganization(
    organizationId: string,
    options: ListOptions,
  ): Promise<PaginatedResult> {
    const { assetType, page, limit } = options;
    const where: any = { organizationId };
    if (assetType) {
      where.assetType = assetType;
    }
    const [items, total] = await this.snapshotRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }
}
