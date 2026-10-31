import { lockStoredVideo } from '../../../modules/media/services/stored-video.js';
import { SignageMedia } from '@o4o-apps/digital-signage-core/entities';
import type { DataSource } from 'typeorm';
import { SignageMediaRepository } from '../repositories/media.repository.js';
import { SignageMediaUsageService, type MediaUsageResult } from './media-usage.service.js';
import { toMediaResponse } from './signage-formatters.js';
import type {
  CreateMediaDto,
  UpdateMediaDto,
  MediaQueryDto,
  MediaResponseDto,
  ScopeFilter,
  PaginatedResponse,
  MediaLibraryResponseDto,
} from '../dto/index.js';

function parseHostedVideo(value: string): { sourceType: 'youtube' | 'vimeo'; embedId: string; sourceUrl: string } | null {
  try {
    const u = new URL(value), host = u.hostname.toLowerCase(), parts = u.pathname.split('/').filter(Boolean);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return null;
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be', 'www.youtube-nocookie.com'].includes(host)) {
      const id = host.endsWith('youtu.be') ? parts[0] : u.searchParams.get('v') || (['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : null);
      return id && /^[\w-]{11}$/.test(id) ? { sourceType: 'youtube', embedId: id, sourceUrl: `https://www.youtube.com/watch?v=${id}` } : null;
    }
    if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
      const id = parts.find(part => /^\d+$/.test(part));
      return id ? { sourceType: 'vimeo', embedId: id, sourceUrl: `https://vimeo.com/${id}` } : null;
    }
  } catch { /* Invalid addresses are reported to the editor. */ }
  return null;
}
function videoInputError(message: string, code = 'UNSUPPORTED_VIDEO_SOURCE') {
  return Object.assign(new Error(message), { code, statusCode: 400 });
}

export class SignageMediaService {
  private repository: SignageMediaRepository;
  private usageService: SignageMediaUsageService;

  constructor(private dataSource: DataSource) {
    this.repository = new SignageMediaRepository(dataSource);
    this.usageService = new SignageMediaUsageService(dataSource);
  }

  /**
   * 미디어 사용처 조회 (WO-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1)
   * scope 내 미디어인지 먼저 확인 후 사용처를 계산한다.
   */
  async getMediaUsage(
    id: string,
    scope: ScopeFilter,
  ): Promise<MediaUsageResult | null> {
    const media = await this.repository.findMediaById(id, scope);
    if (!media) return null;
    return this.usageService.computeUsage(id);
  }

  async getMedia(id: string, scope: ScopeFilter): Promise<MediaResponseDto | null> {
    const media = await this.repository.findMediaById(id, scope);
    if (!media) return null;
    return toMediaResponse(media);
  }

  async getMediaList(
    query: MediaQueryDto,
    scope: ScopeFilter,
  ): Promise<PaginatedResponse<MediaResponseDto>> {
    const { data, total } = await this.repository.findMedia(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(m => toMediaResponse(m)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async createMedia(
    dto: CreateMediaDto,
    scope: ScopeFilter,
    userId?: string,
  ): Promise<MediaResponseDto> {
    if (dto.mediaType === 'video' && dto.sourceType === 'url') return this.createLibraryVideo(dto, scope, userId);
    const hosted = dto.mediaType === 'video' ? parseHostedVideo(dto.sourceUrl) : null;
    if (dto.mediaType === 'video' && !hosted) throw videoInputError('YouTube/Vimeo 개별 영상 주소 또는 O4O 보관 영상을 선택해 주세요.');

    // Tags validation
    if (!dto.tags || dto.tags.length === 0) {
      throw Object.assign(new Error('태그를 최소 1개 이상 입력해주세요'), {
        code: 'TAGS_REQUIRED',
        statusCode: 400,
      });
    }

    const media = await this.repository.createMedia({
      ...dto,
      ...(hosted ?? {}),
      metadata: { ...dto.metadata, mediaLibraryAssetId: null },
      serviceKey: scope.serviceKey,
      organizationId: scope.organizationId || null,
      createdByUserId: userId || null,
      status: 'active',
    });
    return toMediaResponse(media);
  }

  async updateMedia(
    id: string,
    dto: UpdateMediaDto,
    scope: ScopeFilter,
  ): Promise<MediaResponseDto | null> {
    const existing = await this.repository.findMediaById(id, scope);
    if (!existing) return null;
    const updateData: UpdateMediaDto & { embedId?: string | null } = {
      ...dto, sourceType: existing.sourceType,
      metadata: { ...existing.metadata, ...dto.metadata, mediaLibraryAssetId: existing.metadata?.mediaLibraryAssetId ?? null },
    };
    if (existing.metadata?.mediaLibraryAssetId && 'mediaType' in dto && dto.mediaType !== 'video') throw videoInputError('보관 영상의 자료 종류는 변경할 수 없습니다.');
    if (dto.sourceUrl !== undefined && existing.mediaType === 'video') {
      if (existing.metadata?.mediaLibraryAssetId) {
        if (dto.sourceUrl !== existing.sourceUrl) throw videoInputError('보관 영상은 미디어 라이브러리에서 새로 선택해 등록해 주세요.');
      } else {
        const hosted = parseHostedVideo(dto.sourceUrl);
        if (!hosted) throw videoInputError('YouTube 또는 Vimeo 개별 영상 주소를 입력해 주세요.');
        Object.assign(updateData, hosted);
      }
    }
    const media = await this.repository.updateMedia(id, updateData, scope);
    if (!media) return null;
    return toMediaResponse(media);
  }

  private async createLibraryVideo(dto: CreateMediaDto, scope: ScopeFilter, userId?: string): Promise<MediaResponseDto> {
    const assetId = dto.mediaLibraryAssetId;
    if (!scope.organizationId || !userId || typeof assetId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetId))
      throw videoInputError('미디어 라이브러리에서 보관 영상을 선택해 주세요.', 'MEDIA_LIBRARY_VIDEO_REQUIRED');
    return this.dataSource.transaction(async manager => {
      // Same row lock as MediaLibrary deletion: a selected file cannot disappear during registration.
      const asset = await lockStoredVideo(manager, assetId, userId);
      const repository = manager.getRepository(SignageMedia);
      const existing = await repository.createQueryBuilder('m')
        .where('m.serviceKey = :serviceKey AND m.organizationId = :organizationId', scope)
        .andWhere("m.metadata->>'mediaLibraryAssetId' = :assetId", { assetId }).getOne();
      if (existing) return toMediaResponse(existing);
      const media = repository.create({
        name: dto.name?.trim() || asset.originalName, description: dto.description,
        mediaType: 'video', sourceType: 'url', sourceUrl: asset.url,
        mimeType: asset.mimeType, fileSize: Number(asset.fileSize),
        metadata: { mediaLibraryAssetId: asset.id }, tags: dto.tags?.length ? dto.tags : ['매장 영상'],
        serviceKey: scope.serviceKey, organizationId: scope.organizationId, createdByUserId: userId, status: 'active',
      });
      return toMediaResponse(await repository.save(media));
    });
  }

  async deleteMedia(id: string, scope: ScopeFilter): Promise<boolean> {
    return this.repository.softDeleteMedia(id, scope);
  }

  async hardDeleteMedia(
    id: string,
    scope: ScopeFilter,
  ): Promise<{ deleted: boolean; code?: string; usage?: MediaUsageResult }> {
    return this.repository.hardDeleteMedia(id, scope);
  }

  async getMediaLibrary(
    scope: ScopeFilter,
    mediaType?: string,
    _category?: string,
    search?: string,
  ): Promise<MediaLibraryResponseDto> {
    const { platform, organization } = await this.repository.findMediaLibrary(
      scope,
      mediaType,
      undefined,
      search,
    );

    return {
      platform: platform.map(m => toMediaResponse(m)),
      organization: organization.map(m => toMediaResponse(m)),
      supplier: [],
      meta: {
        page: 1,
        limit: 50,
        total: platform.length + organization.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  }
}
