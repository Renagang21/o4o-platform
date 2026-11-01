import type { DataSource } from 'typeorm';
import type { ContentResolver, ResolvedContent } from '@o4o/asset-copy-core';

/** Community's shared catalog only. Store-owned and other service media never enter this adapter. */
export class CommunitySignageResolver implements ContentResolver {
  constructor(private db: DataSource) {}
  async resolve(id: string, assetType: string): Promise<ResolvedContent | null> {
    if (assetType !== 'signage' || !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) return null;
    const [media] = await this.db.query(`SELECT id,name,description,"mediaType","sourceType","sourceUrl","embedId","thumbnailUrl",tags,metadata
      FROM signage_media WHERE id=$1 AND "serviceKey"='community' AND source='community' AND scope='global' AND status='active' AND "deletedAt" IS NULL`, [id]);
    if (!media) return null;
    return { title: media.name, type: 'signage', sourceService: 'community', contentJson: {
      title: media.name, description: media.description, mediaType: media.mediaType, sourceType: media.sourceType,
      sourceUrl: media.sourceUrl, embedId: media.embedId, thumbnailUrl: media.thumbnailUrl, tags: media.tags, metadata: media.metadata,
    } };
  }
}
