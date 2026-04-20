import type { DataSource } from 'typeorm';
import { SignagePlaylistRepository } from '../repositories/playlist.repository.js';
import { SignageMediaRepository } from '../repositories/media.repository.js';
import {
  toPlaylistResponse,
  toPlaylistDetailResponse,
  toPlaylistItemResponse,
} from './signage-formatters.js';
import type {
  CreatePlaylistDto,
  UpdatePlaylistDto,
  PlaylistQueryDto,
  PlaylistResponseDto,
  PlaylistDetailResponseDto,
  PlaylistItemResponseDto,
  CreatePlaylistItemDto,
  UpdatePlaylistItemDto,
  ReorderPlaylistItemsDto,
  BulkCreatePlaylistItemsDto,
  ScopeFilter,
  PaginatedResponse,
} from '../dto/index.js';

export class SignagePlaylistService {
  private repository: SignagePlaylistRepository;
  private mediaRepository: SignageMediaRepository;

  constructor(dataSource: DataSource) {
    this.repository = new SignagePlaylistRepository(dataSource);
    this.mediaRepository = new SignageMediaRepository(dataSource);
  }

  async getPlaylist(id: string, scope: ScopeFilter): Promise<PlaylistDetailResponseDto | null> {
    const playlist = await this.repository.findPlaylistById(id, scope);
    if (!playlist) return null;
    return toPlaylistDetailResponse(playlist);
  }

  async getPlaylists(
    query: PlaylistQueryDto,
    scope: ScopeFilter,
  ): Promise<PaginatedResponse<PlaylistResponseDto>> {
    const { data, total } = await this.repository.findPlaylists(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(p => toPlaylistResponse(p)),
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

  async createPlaylist(
    dto: CreatePlaylistDto,
    scope: ScopeFilter,
    userId?: string,
  ): Promise<PlaylistResponseDto> {
    const playlist = await this.repository.createPlaylist({
      ...dto,
      serviceKey: scope.serviceKey,
      organizationId: scope.organizationId || null,
      createdByUserId: userId || null,
      itemCount: 0,
      totalDuration: 0,
      likeCount: 0,
      downloadCount: 0,
    });
    return toPlaylistResponse(playlist);
  }

  async updatePlaylist(
    id: string,
    dto: UpdatePlaylistDto,
    scope: ScopeFilter,
  ): Promise<PlaylistResponseDto | null> {
    const playlist = await this.repository.updatePlaylist(id, dto, scope);
    if (!playlist) return null;
    return toPlaylistResponse(playlist);
  }

  async deletePlaylist(id: string, scope: ScopeFilter): Promise<boolean> {
    return this.repository.softDeletePlaylist(id, scope);
  }

  async hardDeletePlaylist(
    id: string,
    scope: ScopeFilter,
  ): Promise<{ deleted: boolean; code?: string }> {
    return this.repository.hardDeletePlaylist(id, scope);
  }

  // ========== Playlist Item Methods ==========

  async getPlaylistItems(
    playlistId: string,
    scope: ScopeFilter,
  ): Promise<PlaylistItemResponseDto[]> {
    const playlist = await this.repository.findPlaylistById(playlistId, scope);
    if (!playlist) {
      throw new Error('Playlist not found');
    }
    const items = await this.repository.findPlaylistItems(playlistId);
    return items.map(item => toPlaylistItemResponse(item));
  }

  async addPlaylistItem(
    playlistId: string,
    dto: CreatePlaylistItemDto,
    scope: ScopeFilter,
  ): Promise<PlaylistItemResponseDto> {
    const playlist = await this.repository.findPlaylistById(playlistId, scope);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // HQ 참조 아이템: organizationId 필터 없이 HQ 미디어 직접 조회 (WO-SIGNAGE-DIRECT-REFERENCE-ITEM-V1)
    // sourceType='hq'이면 복사 없이 HQ 미디어를 플레이리스트에 직접 편성한다.
    const media = dto.sourceType === 'hq'
      ? await this.mediaRepository.findGlobalMediaById(dto.mediaId, scope.serviceKey)
      : await this.mediaRepository.findMediaById(dto.mediaId, scope);
    if (!media) {
      throw new Error('Media not found');
    }

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const maxOrder = await this.repository.getMaxSortOrder(playlistId);
      sortOrder = maxOrder + 1;
    }

    const item = await this.repository.createPlaylistItem({
      playlistId,
      mediaId: dto.mediaId,
      sortOrder,
      duration: dto.duration,
      transitionType: dto.transitionType,
      isActive: dto.isActive ?? true,
      isForced: dto.isForced ?? false,
      sourceType: dto.sourceType ?? 'platform',
      metadata: dto.metadata,
    });

    await this.repository.updatePlaylistStats(playlistId);

    return toPlaylistItemResponse(item);
  }

  async addPlaylistItemsBulk(
    playlistId: string,
    dto: BulkCreatePlaylistItemsDto,
    scope: ScopeFilter,
  ): Promise<PlaylistItemResponseDto[]> {
    const playlist = await this.repository.findPlaylistById(playlistId, scope);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    let currentOrder = await this.repository.getMaxSortOrder(playlistId);

    const itemsToCreate = dto.items.map(item => ({
      playlistId,
      mediaId: item.mediaId,
      sortOrder: item.sortOrder ?? ++currentOrder,
      duration: item.duration,
      transitionType: item.transitionType,
      isActive: item.isActive ?? true,
      isForced: item.isForced ?? false,
      sourceType: item.sourceType ?? 'platform',
      metadata: item.metadata,
    }));

    const items = await this.repository.createPlaylistItemsBulk(itemsToCreate);

    await this.repository.updatePlaylistStats(playlistId);

    return items.map(item => toPlaylistItemResponse(item));
  }

  async updatePlaylistItem(
    playlistId: string,
    itemId: string,
    dto: UpdatePlaylistItemDto,
    scope: ScopeFilter,
  ): Promise<PlaylistItemResponseDto | null> {
    const playlist = await this.repository.findPlaylistById(playlistId, scope);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    const existingItem = await this.repository.findPlaylistItemById(itemId);
    if (!existingItem || existingItem.playlistId !== playlistId) {
      return null;
    }

    const item = await this.repository.updatePlaylistItem(itemId, dto);
    if (!item) return null;

    if (dto.duration !== undefined || dto.isActive !== undefined) {
      await this.repository.updatePlaylistStats(playlistId);
    }

    return toPlaylistItemResponse(item);
  }

  async deletePlaylistItem(
    playlistId: string,
    itemId: string,
    scope: ScopeFilter,
  ): Promise<boolean> {
    const playlist = await this.repository.findPlaylistById(playlistId, scope);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    const success = await this.repository.deletePlaylistItem(itemId);
    if (success) {
      await this.repository.updatePlaylistStats(playlistId);
    }
    return success;
  }

  async reorderPlaylistItems(
    playlistId: string,
    dto: ReorderPlaylistItemsDto,
    scope: ScopeFilter,
  ): Promise<PlaylistItemResponseDto[]> {
    const playlist = await this.repository.findPlaylistById(playlistId, scope);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    await this.repository.reorderPlaylistItems(playlistId, dto.items);
    const items = await this.repository.findPlaylistItems(playlistId);
    return items.map(item => toPlaylistItemResponse(item));
  }
}
