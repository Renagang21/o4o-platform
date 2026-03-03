/**
 * Neture Asset Resolver
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 *
 * Resolves Neture signage assets into the standard ResolvedContent format.
 *
 * Source tables:
 * - Signage: signage_media (shared platform table)
 */

import { DataSource } from 'typeorm';
import type { ContentResolver, ResolvedContent } from '@o4o/asset-copy-core';

export class NetureAssetResolver implements ContentResolver {
  constructor(private dataSource: DataSource) {}

  async resolve(sourceAssetId: string, assetType: string): Promise<ResolvedContent | null> {
    if (assetType === 'signage') {
      return this.resolveSignage(sourceAssetId);
    }
    return null;
  }

  private async resolveSignage(id: string): Promise<ResolvedContent | null> {
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
