/**
 * Neture Asset Resolver
 *
 * WO-O4O-ASSET-COPY-NETURE-PILOT-V1 Phase 1
 *
 * Resolves Neture supplier content (CMS) and signage assets
 * into the standard ResolvedAsset format.
 *
 * Source tables:
 * - CMS: neture_supplier_contents
 * - Signage: signage_media (shared platform table, filtered by context)
 */

import { DataSource } from 'typeorm';
import { NetureSupplierContent } from '../../neture/entities/NetureSupplierContent.entity.js';
import type { AssetResolver, ResolvedAsset } from '../interfaces/asset-resolver.interface.js';

export class NetureAssetResolver implements AssetResolver {
  constructor(private dataSource: DataSource) {}

  async resolve(sourceAssetId: string, assetType: 'cms' | 'signage'): Promise<ResolvedAsset | null> {
    if (assetType === 'cms') {
      return this.resolveCms(sourceAssetId);
    }
    if (assetType === 'signage') {
      return this.resolveSignage(sourceAssetId);
    }
    return null;
  }

  private async resolveCms(id: string): Promise<ResolvedAsset | null> {
    const repo = this.dataSource.getRepository(NetureSupplierContent);
    const content = await repo.findOne({ where: { id } });
    if (!content) return null;

    return {
      title: content.title,
      type: 'cms',
      sourceService: 'neture',
      contentJson: {
        title: content.title,
        type: content.type,
        description: content.description,
        body: content.body,
        imageUrl: content.imageUrl,
        status: content.status,
        availableServices: content.availableServices,
        availableAreas: content.availableAreas,
      },
    };
  }

  private async resolveSignage(id: string): Promise<ResolvedAsset | null> {
    // Signage uses the shared platform signage_media table
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
      type: 'signage',
      sourceService: 'neture',
      contentJson: {
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
      },
    };
  }
}
