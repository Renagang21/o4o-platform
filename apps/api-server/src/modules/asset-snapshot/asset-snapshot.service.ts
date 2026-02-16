/**
 * AssetSnapshot Service
 *
 * WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1
 * WO-O4O-ASSET-COPY-NETURE-PILOT-V1 (Resolver pattern)
 *
 * Handles:
 * - Copy CMS/Signage source asset → o4o_asset_snapshots
 * - List snapshots for a given organization
 *
 * No FK to source — snapshot is an independent copy.
 */

import { DataSource, Repository } from 'typeorm';
import { AssetSnapshot } from './entities/asset-snapshot.entity.js';
import { CmsContent } from '@o4o-apps/cms-core/entities';
import type { AssetResolver } from './interfaces/asset-resolver.interface.js';

export interface CopyAssetInput {
  sourceService: string;
  sourceAssetId: string;
  assetType: 'cms' | 'signage';
  targetOrganizationId: string;
  createdBy: string;
}

export interface CopyResolvedAssetInput {
  sourceService: string;
  sourceAssetId: string;
  assetType: 'cms' | 'signage';
  targetOrganizationId: string;
  createdBy: string;
  title: string;
  contentJson: Record<string, unknown>;
}

export interface CopyAssetResult {
  snapshot: AssetSnapshot;
}

export interface ListOptions {
  assetType?: 'cms' | 'signage';
  page: number;
  limit: number;
}

export interface PaginatedResult {
  items: AssetSnapshot[];
  total: number;
  page: number;
  limit: number;
}

export class AssetSnapshotService {
  private snapshotRepo: Repository<AssetSnapshot>;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.snapshotRepo = dataSource.getRepository(AssetSnapshot);
  }

  /**
   * Copy a source asset into an independent snapshot
   */
  async copyAsset(input: CopyAssetInput): Promise<CopyAssetResult> {
    const { sourceService, sourceAssetId, assetType, targetOrganizationId, createdBy } = input;

    // Fetch source asset content
    const contentJson = await this.fetchSourceContent(sourceAssetId, assetType);
    if (!contentJson) {
      throw new Error('SOURCE_NOT_FOUND');
    }

    // Check duplicate: same org + source + type
    const existing = await this.snapshotRepo.findOne({
      where: {
        organizationId: targetOrganizationId,
        sourceAssetId,
        assetType,
      },
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
      title: (contentJson.title as string) || 'Untitled',
      contentJson: contentJson as Record<string, unknown>,
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
   * Copy using a service-specific Resolver (WO-O4O-ASSET-COPY-NETURE-PILOT-V1)
   *
   * The controller passes a resolver; this service calls it to get content,
   * then stores the snapshot. The service never knows the source structure.
   */
  async copyWithResolver(
    input: CopyAssetInput,
    resolver: AssetResolver,
  ): Promise<CopyAssetResult> {
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
  async copyResolved(input: CopyResolvedAssetInput): Promise<CopyAssetResult> {
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

  /**
   * Fetch source content from CMS or Signage tables
   */
  private async fetchSourceContent(
    sourceAssetId: string,
    assetType: 'cms' | 'signage',
  ): Promise<Record<string, unknown> | null> {
    if (assetType === 'cms') {
      return this.fetchCmsContent(sourceAssetId);
    }
    if (assetType === 'signage') {
      return this.fetchSignageContent(sourceAssetId);
    }
    return null;
  }

  private async fetchCmsContent(id: string): Promise<Record<string, unknown> | null> {
    const repo = this.dataSource.getRepository(CmsContent);
    const content = await repo.findOne({ where: { id } });
    if (!content) return null;

    return {
      title: content.title,
      type: content.type,
      summary: content.summary,
      body: content.body,
      imageUrl: content.imageUrl,
      linkUrl: content.linkUrl,
      linkText: content.linkText,
      metadata: content.metadata,
    };
  }

  private async fetchSignageContent(id: string): Promise<Record<string, unknown> | null> {
    // Use raw query to avoid importing SignageMedia entity directly
    // (it's in digital-signage-core, using spread entities pattern)
    const rows = await this.dataSource.query(
      `SELECT "id", "name", "description", "mediaType", "sourceType", "sourceUrl",
              "thumbnailUrl", "duration", "resolution", "content", "tags", "category", "metadata"
       FROM "signage_media"
       WHERE "id" = $1 AND "deletedAt" IS NULL
       LIMIT 1`,
      [id],
    );
    if (!rows || rows.length === 0) return null;

    const media = rows[0];
    return {
      title: media.name,
      mediaType: media.mediaType,
      sourceType: media.sourceType,
      sourceUrl: media.sourceUrl,
      thumbnailUrl: media.thumbnailUrl,
      duration: media.duration,
      resolution: media.resolution,
      content: media.content,
      tags: media.tags,
      category: media.category,
      description: media.description,
      metadata: media.metadata,
    };
  }
}
