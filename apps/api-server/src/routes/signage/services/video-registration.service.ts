import { createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { SignageMedia } from '@o4o-apps/digital-signage-core/entities';
import { lockStoredVideo } from '../../../modules/media/services/stored-video.js';
import { parseHostedVideo } from './hosted-video-source.js';
import { toMediaResponse } from './signage-formatters.js';

export interface VideoRegistrationInput {
  requestId: string;
  name: string;
  description?: string;
  tags?: string[];
  sourceUrl?: string;
  mediaLibraryAssetId?: string;
}
export interface VideoRegistrationScope {
  serviceKey: string;
  actorId: string;
  organizationId?: string;
  community?: boolean;
}
const UUID = /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
function invalid(message: string, code = 'INVALID_VIDEO_REGISTRATION', statusCode = 400): never {
  throw Object.assign(new Error(message), { code, statusCode });
}
/** The caller resolves live domain access; no scope or publication state comes from AI/client metadata. */
export async function registerVideo(db: DataSource, scope: VideoRegistrationScope, input: VideoRegistrationInput) {
  if (!scope.actorId || (!scope.community && !scope.organizationId) || (scope.community && scope.serviceKey !== 'community')) invalid('등록 권한을 확인해 주세요.', 'VIDEO_SCOPE_REQUIRED', 403);
  if (!input || typeof input.requestId !== 'string' || !UUID.test(input.requestId) || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 255
    || (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 2000))
    || (input.tags !== undefined && (!Array.isArray(input.tags) || input.tags.length > 10 || input.tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 50)))) invalid('영상 제목과 등록 내용을 확인해 주세요.');
  const assetId = input.mediaLibraryAssetId;
  const hosted = !assetId && typeof input.sourceUrl === 'string' ? parseHostedVideo(input.sourceUrl) : null;
  if ((assetId && (typeof assetId !== 'string' || !UUID.test(assetId))) || (!assetId && !hosted)) invalid('업로드·처리가 끝난 개별 영상 주소 또는 O4O 보관 영상을 선택해 주세요.');
  const content = { name: input.name.trim(), description: input.description?.trim() || '', tags: input.tags?.length ? input.tags.map(tag => tag.trim()) : ['디지털사이니지'], source: assetId || hosted!.sourceUrl };
  const hash = createHash('sha256').update(JSON.stringify(content)).digest('hex');
  const key = `${scope.serviceKey}:${scope.organizationId ?? 'community'}:${scope.actorId}:${input.requestId.toLowerCase()}`;
  const raw = createHash('sha256').update(key).digest('hex');
  const id = `${raw.slice(0,8)}-${raw.slice(8,12)}-4${raw.slice(13,16)}-a${raw.slice(17,20)}-${raw.slice(20,32)}`;
  return db.transaction(async manager => {
    await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
    const repo = manager.getRepository<SignageMedia>('SignageMedia');
    const existing = await repo.findOne({ where: { id }, withDeleted: true });
    if (existing) {
      if (existing.metadata?.registrationHash !== hash) invalid('이 요청의 내용이 변경됐습니다. 새 등록으로 시작해 주세요.', 'VIDEO_REQUEST_CHANGED', 409);
      if (existing.deletedAt) invalid('이미 삭제한 등록입니다. 새 등록으로 시작해 주세요.', 'VIDEO_REGISTRATION_DELETED', 410);
      return toMediaResponse(existing);
    }
    const asset = assetId ? await lockStoredVideo(manager, assetId, scope.actorId) : null;
    if (scope.community && asset && (!asset.isLibraryPublic || !asset.consentedAt)) invalid('서비스에서 함께 이용할 수 있는 보관 영상을 선택해 주세요.');
    const media = repo.create({
      id, name: content.name, description: content.description, tags: content.tags,
      mediaType: 'video', sourceType: asset ? 'url' : hosted!.sourceType,
      sourceUrl: asset?.url ?? hosted!.sourceUrl, embedId: hosted?.embedId ?? null,
      mimeType: asset?.mimeType ?? null, fileSize: asset ? Number(asset.fileSize) : null,
      serviceKey: scope.serviceKey, organizationId: scope.organizationId ?? null,
      source: scope.community ? 'community' : 'store', scope: scope.community ? 'global' : 'store',
      createdByUserId: scope.actorId, status: 'active',
      metadata: { mediaLibraryAssetId: asset?.id ?? null, registrationHash: hash },
    });
    return toMediaResponse(await repo.save(media));
  });
}
