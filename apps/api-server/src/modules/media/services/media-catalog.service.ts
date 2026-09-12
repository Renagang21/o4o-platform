import type { DataSource, EntityManager } from 'typeorm';
import { MediaAsset } from '../entities/MediaAsset.entity.js';

export class MediaCatalogError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export const MEDIA_ENUMS = {
  originType: ['original', 'edited', 'ai_generated', 'external'],
  qaStatus: ['PENDING', 'APPROVED', 'REJECTED'],
  productAccuracyLevel: ['EXACT', 'ACCEPTABLE', 'SUPPORT_ONLY', 'REJECTED'],
  derivationType: [
    'original',
    'background-removed',
    'generated-angle',
    'generated-scene',
    'video-reference',
    'video-clip',
    'edited-video',
    'final-video',
    'thumbnail',
  ],
} as const;
export const MEDIA_TEXT_FIELDS = {
  generationProvider: 100,
  generationModel: 200,
  promptRef: 500,
  generationJobId: 200,
  rightsType: 100,
  sourceUrl: 2048,
} as const;
export const ENTITY_TYPES = [
  'product',
  'brand',
  'content',
  'service',
  'video-production-job',
];
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function mediaUuid(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value))
    throw new MediaCatalogError('INVALID_UUID');
  return value;
}
export function mediaText(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new MediaCatalogError('INVALID_TEXT');
  return value.trim();
}
export function mediaHttps(value: unknown): string {
  const text = mediaText(value, 2048);
  let u: URL;
  try {
    u = new URL(text);
  } catch {
    throw new MediaCatalogError('INVALID_URL');
  }
  if (u.protocol !== 'https:' || u.username || u.password)
    throw new MediaCatalogError('HTTPS_URL_REQUIRED');
  return u.href;
}
/** No remote fetch, redirects or embed HTML. URLs are catalog references only. */
export function externalMedia(input: Record<string, unknown>) {
  const provider = input.provider;
  let url = mediaHttps(input.externalUrl);
  let externalId: string | null = null;
  let thumbnailUrl = input.thumbnailUrl ? mediaHttps(input.thumbnailUrl) : null;
  if (provider === 'youtube') {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') externalId = u.pathname.slice(1);
    else if (
      ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(u.hostname)
    ) {
      externalId =
        u.pathname === '/watch'
          ? u.searchParams.get('v')
          : (/^\/(?:shorts|embed)\/([^/]+)$/.exec(u.pathname)?.[1] ?? null);
    }
    if (!externalId || !/^[A-Za-z0-9_-]{11}$/.test(externalId))
      throw new MediaCatalogError('INVALID_YOUTUBE_URL');
    url = `https://www.youtube.com/watch?v=${externalId}`;
    thumbnailUrl = `https://i.ytimg.com/vi/${externalId}/hqdefault.jpg`;
  } else if (provider === 'o4o') {
    const u = new URL(url);
    if (
      !(
        u.hostname === 'neture.co.kr' || u.hostname.endsWith('.neture.co.kr')
      ) ||
      u.search ||
      u.hash
    ) {
      throw new MediaCatalogError('O4O_PERMANENT_URL_REQUIRED');
    }
    externalId =
      input.externalId == null ? null : mediaText(input.externalId, 255);
  } else throw new MediaCatalogError('INVALID_PROVIDER');
  return { provider, externalUrl: url, externalId, thumbnailUrl, url };
}
export function mediaMetadata(
  input: Record<string, unknown>,
): Partial<MediaAsset> {
  const result: Record<string, unknown> = {};
  for (const [key, values] of Object.entries(MEDIA_ENUMS)) {
    if (input[key] === undefined) continue;
    if (
      input[key] !== null &&
      !(values as readonly unknown[]).includes(input[key])
    )
      throw new MediaCatalogError('INVALID_' + key);
    result[key] = input[key];
  }
  for (const [key, max] of Object.entries(MEDIA_TEXT_FIELDS)) {
    if (input[key] !== undefined)
      result[key] =
        input[key] === null
          ? null
          : key === 'sourceUrl'
            ? mediaHttps(input[key])
            : mediaText(input[key], max);
  }
  for (const key of ['commercialUseAllowed', 'attributionRequired']) {
    if (input[key] === undefined) continue;
    if (input[key] !== null && typeof input[key] !== 'boolean')
      throw new MediaCatalogError('INVALID_BOOLEAN');
    result[key] = input[key];
  }
  return result;
}

/** V2 management is platform-admin only; opaque links never grant target-domain access. */
export class MediaCatalogService {
  constructor(private ds: DataSource) {}
  async locked(manager: EntityManager, id: string): Promise<MediaAsset> {
    const asset = await manager.getRepository(MediaAsset).findOne({
      where: { id: mediaUuid(id) },
      lock: { mode: 'pessimistic_write' },
    });
    if (!asset) throw new MediaCatalogError('ASSET_NOT_FOUND', 404);
    return asset;
  }
  async createExternal(input: Record<string, unknown>, userId: string) {
    if (input.consent !== true) throw new MediaCatalogError('CONSENT_REQUIRED');
    const external = externalMedia(input);
    const title = mediaText(input.title, 300);
    return this.ds.transaction(async (manager) => {
      const repo = manager.getRepository(MediaAsset);
      return repo.save(
        repo.create({
          ...external,
          title,
          gcsPath: null,
          storageType: 'external',
          originType: 'external',
          originalName: title,
          fileName: external.externalId || 'external-video',
          mimeType: 'video/external',
          fileSize: 0,
          assetType: 'video',
          folder: 'general',
          uploadedBy: userId,
          consentedAt: new Date(),
          isLibraryPublic: true,
          qaStatus: 'PENDING',
        }),
      );
    });
  }
  async patch(id: string, input: Record<string, unknown>, userId: string) {
    const patch = mediaMetadata(input);
    if (input.rootAssetId !== undefined)
      throw new MediaCatalogError('ROOT_IS_DERIVED');
    return this.ds.transaction(async (manager) => {
      // Stable lock order prevents simultaneous reciprocal lineage requests from deadlocking.
      const ids = [mediaUuid(id)];
      if (input.parentAssetId != null) ids.push(mediaUuid(input.parentAssetId));
      const assets = new Map<string, MediaAsset>();
      for (const key of [...new Set(ids)].sort())
        assets.set(key, await this.locked(manager, key));
      const asset = assets.get(id)!;
      if (
        input.parentAssetId !== undefined &&
        input.parentAssetId !== asset.parentAssetId
      ) {
        if (asset.parentAssetId || input.parentAssetId === null)
          throw new MediaCatalogError('LINEAGE_IMMUTABLE', 409);
        const parent = assets.get(input.parentAssetId as string)!;
        if (parent.id === id || parent.rootAssetId === id)
          throw new MediaCatalogError('LINEAGE_CYCLE', 409);
        const descendants = await manager.query(
          'SELECT 1 FROM media_assets WHERE parent_asset_id=$1 OR root_asset_id=$1 LIMIT 1',
          [id],
        );
        if (descendants.length)
          throw new MediaCatalogError('LINEAGE_HAS_DESCENDANTS', 409);
        if (!patch.derivationType || patch.derivationType === 'original')
          throw new MediaCatalogError('DERIVATION_REQUIRED');
        asset.parentAssetId = parent.id;
        asset.rootAssetId = parent.rootAssetId || parent.id;
      }
      const derivation =
        patch.derivationType === undefined
          ? asset.derivationType
          : patch.derivationType;
      if (asset.parentAssetId && (!derivation || derivation === 'original'))
        throw new MediaCatalogError('DERIVATION_REQUIRED');
      if (!asset.parentAssetId && derivation && derivation !== 'original')
        throw new MediaCatalogError('PARENT_REQUIRED');
      Object.assign(asset, patch, { updatedBy: userId });
      return manager.getRepository(MediaAsset).save(asset);
    });
  }
  async relations(id: string) {
    mediaUuid(id);
    const asset = await this.ds.getRepository(MediaAsset).findOneBy({ id });
    if (!asset) throw new MediaCatalogError('ASSET_NOT_FOUND', 404);
    const links = await this.ds.query(
      `SELECT id, media_asset_id AS "mediaAssetId", entity_type AS "entityType", entity_id AS "entityId", purpose, created_at AS "createdAt" FROM media_entity_links WHERE media_asset_id=$1 ORDER BY created_at,id`,
      [id],
    );
    const children = await this.ds.getRepository(MediaAsset).find({
      where: { parentAssetId: id },
      order: { createdAt: 'ASC' },
      take: 100,
    });
    return {
      links,
      parentAssetId: asset.parentAssetId,
      rootAssetId: asset.rootAssetId || id,
      children,
    };
  }
  async saveLink(id: string, input: Record<string, unknown>, linkId?: string) {
    const entityType = mediaText(input.entityType, 40);
    if (!ENTITY_TYPES.includes(entityType))
      throw new MediaCatalogError('INVALID_ENTITY_TYPE');
    // Service slugs and future production job IDs are opaque identifiers, never SQL/table names.
    const entityId = mediaText(input.entityId, 200);
    const purpose = mediaText(input.purpose, 100);
    return this.ds.transaction(async (manager) => {
      await this.locked(manager, id);
      if (linkId) {
        const rows = await manager.query(
          'UPDATE media_entity_links SET entity_type=$3,entity_id=$4,purpose=$5 WHERE id=$1 AND media_asset_id=$2 RETURNING id',
          [mediaUuid(linkId), id, entityType, entityId, purpose],
        );
        if (!rows.length) throw new MediaCatalogError('LINK_NOT_FOUND', 404);
        return rows[0];
      }
      const rows = await manager.query(
        `INSERT INTO media_entity_links(media_asset_id,entity_type,entity_id,purpose) VALUES($1,$2,$3,$4) ON CONFLICT(media_asset_id,entity_type,entity_id,purpose) DO UPDATE SET purpose=EXCLUDED.purpose RETURNING id`,
        [id, entityType, entityId, purpose],
      );
      return rows[0];
    });
  }
  async removeLink(id: string, linkId: string) {
    return this.ds.transaction(async (manager) => {
      await this.locked(manager, id);
      const rows = await manager.query(
        'DELETE FROM media_entity_links WHERE id=$1 AND media_asset_id=$2 RETURNING id',
        [mediaUuid(linkId), id],
      );
      if (!rows.length) throw new MediaCatalogError('LINK_NOT_FOUND', 404);
    });
  }
}
