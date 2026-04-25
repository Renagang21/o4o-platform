import type { DataSource } from 'typeorm';
import type { SignageSchedule } from '@o4o-apps/digital-signage-core/entities';
import { SignageScheduleRepository } from '../repositories/schedule.repository.js';
import { SignagePlaylistRepository } from '../repositories/playlist.repository.js';
import {
  toPlaylistResponse,
  toPlaylistItemResponse,
  toScheduleResponse,
} from './signage-formatters.js';
import type {
  CreateScheduleDto,
  UpdateScheduleDto,
  ScheduleQueryDto,
  ScheduleResponseDto,
  ScopeFilter,
  PaginatedResponse,
  ActiveContentResponseDto,
  ScheduleCalendarQueryDto,
  ScheduleCalendarResponseDto,
  ScheduleCalendarEventDto,
  PresignedUploadRequestDto,
  PresignedUploadResponseDto,
} from '../dto/index.js';

export class SignageScheduleService {
  private repository: SignageScheduleRepository;
  private playlistRepository: SignagePlaylistRepository;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.repository = new SignageScheduleRepository(dataSource);
    this.playlistRepository = new SignagePlaylistRepository(dataSource);
  }

  async getSchedule(id: string, scope: ScopeFilter): Promise<ScheduleResponseDto | null> {
    const schedule = await this.repository.findScheduleById(id, scope);
    if (!schedule) return null;
    return toScheduleResponse(schedule);
  }

  async getSchedules(
    query: ScheduleQueryDto,
    scope: ScopeFilter,
  ): Promise<PaginatedResponse<ScheduleResponseDto>> {
    const { data, total } = await this.repository.findSchedules(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(s => toScheduleResponse(s)),
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

  async createSchedule(
    dto: CreateScheduleDto,
    scope: ScopeFilter,
  ): Promise<ScheduleResponseDto> {
    // At least one playlist reference is required
    if (!dto.playlistId && !dto.storePlaylistId) {
      throw new Error('playlistId or storePlaylistId is required');
    }

    // Validate Core playlist (if provided)
    if (dto.playlistId) {
      const playlist = await this.playlistRepository.findPlaylistById(dto.playlistId, scope);
      if (!playlist) {
        throw new Error('Playlist not found');
      }
    }

    // Validate Store playlist (if provided)
    if (dto.storePlaylistId) {
      const exists = await this.checkStorePlaylist(dto.storePlaylistId, scope);
      if (!exists) {
        throw new Error('Store playlist not found');
      }
    }

    const schedule = await this.repository.createSchedule({
      ...dto,
      serviceKey: scope.serviceKey,
      organizationId: scope.organizationId || null,
      playlistId: dto.playlistId || null,
      storePlaylistId: dto.storePlaylistId || null,
      channelId: dto.channelId || null,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      isActive: dto.isActive ?? true,
      priority: dto.priority ?? 0,
    });
    return toScheduleResponse(schedule);
  }

  async updateSchedule(
    id: string,
    dto: UpdateScheduleDto,
    scope: ScopeFilter,
  ): Promise<ScheduleResponseDto | null> {
    if (dto.playlistId) {
      const playlist = await this.playlistRepository.findPlaylistById(dto.playlistId, scope);
      if (!playlist) {
        throw new Error('Playlist not found');
      }
    }

    if (dto.storePlaylistId) {
      const exists = await this.checkStorePlaylist(dto.storePlaylistId, scope);
      if (!exists) {
        throw new Error('Store playlist not found');
      }
    }

    const { validFrom, validUntil, ...restDto } = dto;
    const updateData: Partial<SignageSchedule> = {
      ...restDto,
    };
    if (validFrom !== undefined) {
      updateData.validFrom = validFrom ? new Date(validFrom) : null;
    }
    if (validUntil !== undefined) {
      updateData.validUntil = validUntil ? new Date(validUntil) : null;
    }

    const schedule = await this.repository.updateSchedule(id, updateData, scope);
    if (!schedule) return null;
    return toScheduleResponse(schedule);
  }

  async deleteSchedule(id: string, scope: ScopeFilter): Promise<boolean> {
    return this.repository.softDeleteSchedule(id, scope);
  }

  async resolveActiveContent(
    channelId: string | null,
    scope: ScopeFilter,
    currentTime?: Date,
  ): Promise<ActiveContentResponseDto> {
    const resolveTime = currentTime || new Date();
    const schedule = await this.repository.findActiveSchedule(channelId, scope, resolveTime);

    if (!schedule) {
      return {
        playlist: null,
        schedule: null,
        items: [],
        resolvedAt: resolveTime.toISOString(),
        nextScheduleChange: null,
      };
    }

    // Store playlist takes priority
    if (schedule.storePlaylistId) {
      const storeItems = await this.dataSource.query(
        `SELECT spi.id, spi.snapshot_id AS "snapshotId", spi.display_order AS "displayOrder",
                spi.is_forced AS "isForced", spi.is_locked AS "isLocked",
                snap.title, snap.content_json AS "contentJson", snap.asset_type AS "assetType"
         FROM store_playlist_items spi
         JOIN o4o_asset_snapshots snap ON snap.id = spi.snapshot_id
         WHERE spi.playlist_id = $1
         ORDER BY spi.display_order ASC`,
        [schedule.storePlaylistId],
      );
      return {
        playlist: null,
        schedule: toScheduleResponse(schedule),
        items: storeItems,
        resolvedAt: resolveTime.toISOString(),
        nextScheduleChange: schedule.endTime,
      };
    }

    // Core playlist fallback
    if (!schedule.playlist) {
      return {
        playlist: null,
        schedule: toScheduleResponse(schedule),
        items: [],
        resolvedAt: resolveTime.toISOString(),
        nextScheduleChange: null,
      };
    }

    const items = await this.playlistRepository.findPlaylistItems(schedule.playlistId!);

    return {
      playlist: toPlaylistResponse(schedule.playlist),
      schedule: toScheduleResponse(schedule),
      items: items.map(item => toPlaylistItemResponse(item)),
      resolvedAt: resolveTime.toISOString(),
      nextScheduleChange: schedule.endTime,
    };
  }

  private async checkStorePlaylist(
    storePlaylistId: string,
    scope: ScopeFilter,
  ): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT id FROM store_playlists
       WHERE id = $1 AND organization_id = $2 AND publish_status = 'published' AND is_active = true`,
      [storePlaylistId, scope.organizationId],
    );
    return result.length > 0;
  }

  async getScheduleCalendar(
    query: ScheduleCalendarQueryDto,
    scope: ScopeFilter,
  ): Promise<ScheduleCalendarResponseDto> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const schedules = await this.repository.findSchedulesForCalendar(
      scope,
      startDate,
      endDate,
      query.channelId,
    );

    const events: ScheduleCalendarEventDto[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().slice(0, 10);

      for (const schedule of schedules) {
        if (schedule.daysOfWeek.includes(dayOfWeek)) {
          events.push({
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            playlistId: schedule.playlistId,
            storePlaylistId: schedule.storePlaylistId || null,
            playlistName: schedule.playlist?.name || 'Unknown',
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            daysOfWeek: schedule.daysOfWeek,
            priority: schedule.priority,
            date: dateStr,
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      events,
      startDate: query.startDate,
      endDate: query.endDate,
    };
  }

  async getPresignedUploadUrl(
    dto: PresignedUploadRequestDto,
    scope: ScopeFilter,
  ): Promise<PresignedUploadResponseDto> {
    const timestamp = Date.now();
    const expiresAt = new Date(timestamp + 3600000);

    return {
      uploadUrl: `https://storage.example.com/upload/${scope.serviceKey}/${timestamp}/${dto.fileName}`,
      downloadUrl: `https://storage.example.com/media/${scope.serviceKey}/${timestamp}/${dto.fileName}`,
      fields: {
        'Content-Type': dto.mimeType,
      },
      expiresAt: expiresAt.toISOString(),
    };
  }
}
