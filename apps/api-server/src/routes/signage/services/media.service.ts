import type { DataSource } from 'typeorm';
import { SignageMediaRepository } from '../repositories/media.repository.js';
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

function detectVideoSourceType(url: string): 'youtube' | 'vimeo' | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) return 'youtube';
    if (u.hostname.includes('vimeo.com')) return 'vimeo';
  } catch { /* invalid URL */ }
  return null;
}

function extractEmbedId(sourceType: 'youtube' | 'vimeo', url: string): string | null {
  try {
    const u = new URL(url);
    if (sourceType === 'youtube') {
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0];
      return u.searchParams.get('v');
    }
    if (sourceType === 'vimeo') {
      const m = u.pathname.match(/\/(\d+)/);
      return m ? m[1] : null;
    }
  } catch { /* invalid URL */ }
  return null;
}

export class SignageMediaService {
  private repository: SignageMediaRepository;

  constructor(dataSource: DataSource) {
    this.repository = new SignageMediaRepository(dataSource);
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
    // Core V1: Video media must use YouTube or Vimeo only
    if (dto.mediaType === 'video' && !['youtube', 'vimeo'].includes(dto.sourceType)) {
      throw Object.assign(new Error('유튜브 또는 비메오 URL만 등록할 수 있습니다'), {
        code: 'UNSUPPORTED_VIDEO_SOURCE',
        statusCode: 400,
      });
    }

    // Tags validation
    if (!dto.tags || dto.tags.length === 0) {
      throw Object.assign(new Error('태그를 최소 1개 이상 입력해주세요'), {
        code: 'TAGS_REQUIRED',
        statusCode: 400,
      });
    }

    const media = await this.repository.createMedia({
      ...dto,
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
    // WO-O4O-STORE-SIGNAGE-SOURCEURL-EDIT-ENABLE-V1
    // When sourceUrl is provided, derive sourceType and embedId automatically.
    const updateData: UpdateMediaDto & { embedId?: string | null } = { ...dto };
    if (dto.sourceUrl) {
      const detected = detectVideoSourceType(dto.sourceUrl);
      if (!detected) {
        throw Object.assign(new Error('유튜브 또는 비메오 URL만 등록할 수 있습니다'), {
          code: 'UNSUPPORTED_VIDEO_SOURCE',
          statusCode: 400,
        });
      }
      updateData.sourceType = detected;
      updateData.embedId = extractEmbedId(detected, dto.sourceUrl);
    }
    const media = await this.repository.updateMedia(id, updateData, scope);
    if (!media) return null;
    return toMediaResponse(media);
  }

  async deleteMedia(id: string, scope: ScopeFilter): Promise<boolean> {
    return this.repository.softDeleteMedia(id, scope);
  }

  async hardDeleteMedia(
    id: string,
    scope: ScopeFilter,
  ): Promise<{ deleted: boolean; code?: string }> {
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
