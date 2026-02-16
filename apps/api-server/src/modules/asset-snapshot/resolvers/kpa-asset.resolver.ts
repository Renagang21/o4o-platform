/**
 * KPA Asset Resolver
 *
 * WO-O4O-ASSET-COPY-NETURE-PILOT-V1 Phase 1
 *
 * Resolves KPA community CMS and Signage assets
 * into the standard ResolvedAsset format.
 */

import { DataSource } from 'typeorm';
import { CmsContent } from '@o4o-apps/cms-core/entities';
import type { AssetResolver, ResolvedAsset } from '../interfaces/asset-resolver.interface.js';

export class KpaAssetResolver implements AssetResolver {
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
    const repo = this.dataSource.getRepository(CmsContent);
    const content = await repo.findOne({ where: { id } });
    if (!content) return null;

    return {
      title: content.title,
      type: 'cms',
      sourceService: 'kpa',
      contentJson: {
        title: content.title,
        type: content.type,
        summary: content.summary,
        body: content.body,
        imageUrl: content.imageUrl,
        linkUrl: content.linkUrl,
        linkText: content.linkText,
        metadata: content.metadata,
      },
    };
  }

  private async resolveSignage(id: string): Promise<ResolvedAsset | null> {
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
      sourceService: 'kpa',
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
