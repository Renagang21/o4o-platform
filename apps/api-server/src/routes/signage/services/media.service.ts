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
    const media = await this.repository.updateMedia(id, dto, scope);
    if (!media) return null;
    return toMediaResponse(media);
  }

  async deleteMedia(id: string, scope: ScopeFilter): Promise<boolean> {
    return this.repository.softDeleteMedia(id, scope);
  }

  async getMediaLibrary(
    scope: ScopeFilter,
    mediaType?: string,
    category?: string,
    search?: string,
  ): Promise<MediaLibraryResponseDto> {
    const { platform, organization } = await this.repository.findMediaLibrary(
      scope,
      mediaType,
      category,
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
