import type { DataSource } from 'typeorm';
import { SignageGlobalContentRepository } from '../repositories/global-content.repository.js';
import { SignagePlaylistRepository } from '../repositories/playlist.repository.js';
import { SignageMediaRepository } from '../repositories/media.repository.js';
import {
  toGlobalPlaylistResponse,
  toGlobalMediaResponse,
} from './signage-formatters.js';
import { ALLOWED_STATUS_TRANSITIONS } from '../dto/index.js';
import type {
  GlobalContentQueryDto,
  GlobalPlaylistResponseDto,
  GlobalMediaResponseDto,
  CreateGlobalPlaylistDto,
  CreateGlobalMediaDto,
  UpdateGlobalPlaylistDto,
  UpdateGlobalMediaDto,
  ScopeFilter,
  PaginatedResponse,
  SignageStatus,
} from '../dto/index.js';

export class SignageGlobalContentService {
  private repository: SignageGlobalContentRepository;
  private playlistRepository: SignagePlaylistRepository;
  private mediaRepository: SignageMediaRepository;

  constructor(dataSource: DataSource) {
    this.repository = new SignageGlobalContentRepository(dataSource);
    this.playlistRepository = new SignagePlaylistRepository(dataSource);
    this.mediaRepository = new SignageMediaRepository(dataSource);
  }

  async getGlobalPlaylists(
    query: GlobalContentQueryDto,
    scope: ScopeFilter,
  ): Promise<PaginatedResponse<GlobalPlaylistResponseDto>> {
    const { data, total } = await this.repository.findGlobalPlaylists(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(p => toGlobalPlaylistResponse(p)),
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

  async getGlobalMedia(
    query: GlobalContentQueryDto,
    scope: ScopeFilter,
  ): Promise<PaginatedResponse<GlobalMediaResponseDto>> {
    const { data, total } = await this.repository.findGlobalMedia(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(m => toGlobalMediaResponse(m)),
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

  async createGlobalPlaylist(
    dto: CreateGlobalPlaylistDto,
    scope: ScopeFilter,
    userId?: string,
  ): Promise<GlobalPlaylistResponseDto> {
    const playlist = await this.playlistRepository.createPlaylist({
      ...dto,
      status: (dto as any).status || 'draft',
      serviceKey: scope.serviceKey,
      organizationId: null,
      createdByUserId: userId || null,
      itemCount: 0,
      totalDuration: 0,
      likeCount: 0,
      downloadCount: 0,
      source: dto.source,
      scope: dto.scope,
      parentPlaylistId: null,
    });
    return toGlobalPlaylistResponse(playlist);
  }

  async createGlobalMedia(
    dto: CreateGlobalMediaDto,
    scope: ScopeFilter,
    userId?: string,
  ): Promise<GlobalMediaResponseDto> {
    const media = await this.mediaRepository.createMedia({
      ...dto,
      serviceKey: scope.serviceKey,
      organizationId: null,
      createdByUserId: userId || null,
      status: (dto as any).status || 'draft',
      source: dto.source,
      scope: dto.scope,
      parentMediaId: null,
    });
    return toGlobalMediaResponse(media);
  }

  async updateGlobalPlaylist(
    id: string,
    dto: UpdateGlobalPlaylistDto,
    scope: ScopeFilter,
  ): Promise<GlobalPlaylistResponseDto | null> {
    const { status, ...safeDto } = dto;

    const globalScope: ScopeFilter = {
      serviceKey: scope.serviceKey,
      organizationId: undefined,
    };

    const playlist = await this.playlistRepository.updatePlaylist(id, safeDto, globalScope);
    if (!playlist) return null;
    return toGlobalPlaylistResponse(playlist);
  }

  async updateGlobalMedia(
    id: string,
    dto: UpdateGlobalMediaDto,
    scope: ScopeFilter,
  ): Promise<GlobalMediaResponseDto | null> {
    const { status, ...safeDto } = dto;

    const globalScope: ScopeFilter = {
      serviceKey: scope.serviceKey,
      organizationId: undefined,
    };

    const media = await this.mediaRepository.updateMedia(id, safeDto, globalScope);
    if (!media) return null;
    return toGlobalMediaResponse(media);
  }

  async deleteCommunityMedia(
    id: string,
    userId: string,
    scope: ScopeFilter,
  ): Promise<{ deleted: boolean; code?: string }> {
    const globalScope: ScopeFilter = {
      serviceKey: scope.serviceKey,
      organizationId: undefined,
    };

    const media = await this.mediaRepository.findMediaById(id, globalScope);
    if (!media) return { deleted: false, code: 'NOT_FOUND' };
    if ((media as any).source !== 'community') return { deleted: false, code: 'NOT_COMMUNITY' };
    if ((media as any).createdByUserId !== userId) return { deleted: false, code: 'NOT_OWNER' };

    await this.mediaRepository.softDeleteMedia(id, globalScope);
    return { deleted: true };
  }

  async deleteCommunityPlaylist(
    id: string,
    userId: string,
    scope: ScopeFilter,
  ): Promise<{ deleted: boolean; code?: string }> {
    const globalScope: ScopeFilter = {
      serviceKey: scope.serviceKey,
      organizationId: undefined,
    };

    const playlist = await this.playlistRepository.findPlaylistById(id, globalScope);
    if (!playlist) return { deleted: false, code: 'NOT_FOUND' };
    if ((playlist as any).source !== 'community') return { deleted: false, code: 'NOT_COMMUNITY' };
    if ((playlist as any).createdByUserId !== userId) return { deleted: false, code: 'NOT_OWNER' };

    await this.playlistRepository.softDeletePlaylist(id, globalScope);
    return { deleted: true };
  }

  async transitionHqMediaStatus(
    id: string,
    newStatus: SignageStatus,
    scope: ScopeFilter,
  ): Promise<GlobalMediaResponseDto | null> {
    const globalScope: ScopeFilter = {
      serviceKey: scope.serviceKey,
      organizationId: undefined,
    };

    const media = await this.mediaRepository.findMediaById(id, globalScope);
    if (!media) return null;

    const currentStatus = media.status as SignageStatus;
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition: ${currentStatus} → ${newStatus}`);
    }

    const updated = await this.mediaRepository.updateMedia(id, { status: newStatus }, globalScope);
    if (!updated) return null;
    return toGlobalMediaResponse(updated);
  }

  async transitionHqPlaylistStatus(
    id: string,
    newStatus: SignageStatus,
    scope: ScopeFilter,
  ): Promise<GlobalPlaylistResponseDto | null> {
    const globalScope: ScopeFilter = {
      serviceKey: scope.serviceKey,
      organizationId: undefined,
    };

    const playlist = await this.playlistRepository.findPlaylistById(id, globalScope);
    if (!playlist) return null;

    const currentStatus = playlist.status as SignageStatus;
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition: ${currentStatus} → ${newStatus}`);
    }

    const updated = await this.playlistRepository.updatePlaylist(id, { status: newStatus }, globalScope);
    if (!updated) return null;
    return toGlobalPlaylistResponse(updated);
  }
}
