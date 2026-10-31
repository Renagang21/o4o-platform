import type { EntityManager } from 'typeorm';
import { MediaAsset } from '../entities/MediaAsset.entity.js';
import { isRetiredServiceValue } from '../../../middleware/retired-service.middleware.js';

export function storedVideoUnavailable() {
  return Object.assign(new Error('사용할 수 있는 O4O 보관 영상을 다시 선택해 주세요.'), { code: 'MEDIA_LIBRARY_VIDEO_UNAVAILABLE', statusCode: 400 });
}

/** Serializes registration/reference creation with the existing asset deletion lock. */
export async function lockStoredVideo(manager: EntityManager, id: string, userId?: string): Promise<MediaAsset> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw storedVideoUnavailable();
  const asset = await manager.getRepository(MediaAsset).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
  if (!asset?.gcsPath || asset.assetType !== 'video' || !['video/mp4', 'video/webm'].includes(asset.mimeType)
    || isRetiredServiceValue(asset.serviceKey) || asset.status === 'archived'
    || !(asset.uploadedBy === userId || (asset.isLibraryPublic && asset.consentedAt))) throw storedVideoUnavailable();
  return asset;
}

export async function lockScreenSetVideos(manager: EntityManager, blocks: Array<{ blockType: string; config?: { items?: unknown[] } }>, userId?: string) {
  const references = blocks.filter(block => block.blockType === 'idle_media').flatMap(block => block.config?.items ?? [])
    .filter((item): item is { mediaAssetId: string; url: string } => !!item && typeof item === 'object' && typeof (item as { mediaAssetId?: unknown }).mediaAssetId === 'string');
  // Acquire locks in the same order, sequentially, to avoid cross-reference deadlocks.
  const ids = [...new Set(references.map(item => item.mediaAssetId))].sort((left, right) => left.localeCompare(right));
  await ids.reduce(async (previous, id) => {
    await previous;
    const asset = await lockStoredVideo(manager, id, userId);
    if (references.some(item => item.mediaAssetId === id && item.url !== asset.url)) throw storedVideoUnavailable();
  }, Promise.resolve());
}
