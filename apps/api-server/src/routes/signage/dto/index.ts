/**
 * Signage API DTOs
 *
 * Phase 2 Production Build - Sprint 2-2
 */

// ========== Common Types ==========
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ScopeFilter {
  serviceKey: string;
  organizationId?: string;
}

// ========== Playlist DTOs ==========
export interface CreatePlaylistDto {
  name: string;
  description?: string;
  status?: 'active' | 'inactive' | 'draft';
  loopEnabled?: boolean;
  defaultItemDuration?: number;
  transitionType?: 'none' | 'fade' | 'slide';
  transitionDuration?: number;
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdatePlaylistDto {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'draft';
  loopEnabled?: boolean;
  defaultItemDuration?: number;
  transitionType?: 'none' | 'fade' | 'slide';
  transitionDuration?: number;
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

export interface PlaylistQueryDto {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'draft';
  isPublic?: boolean;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'itemCount';
  sortOrder?: 'asc' | 'desc';
}

export interface PlaylistResponseDto {
  id: string;
  serviceKey: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  status: string;
  loopEnabled: boolean;
  defaultItemDuration: number;
  transitionType: string;
  transitionDuration: number;
  totalDuration: number;
  itemCount: number;
  isPublic: boolean;
  likeCount: number;
  downloadCount: number;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistDetailResponseDto extends PlaylistResponseDto {
  items: PlaylistItemResponseDto[];
}

// ========== Playlist Item DTOs ==========
export interface CreatePlaylistItemDto {
  mediaId: string;
  sortOrder?: number;
  duration?: number;
  transitionType?: 'none' | 'fade' | 'slide';
  isActive?: boolean;
  isForced?: boolean;
  sourceType?: 'platform' | 'hq' | 'supplier' | 'store' | 'operator_ad';
  metadata?: Record<string, any>;
}

export interface UpdatePlaylistItemDto {
  sortOrder?: number;
  duration?: number;
  transitionType?: 'none' | 'fade' | 'slide';
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface ReorderPlaylistItemsDto {
  items: Array<{
    id: string;
    sortOrder: number;
  }>;
}

export interface BulkCreatePlaylistItemsDto {
  items: CreatePlaylistItemDto[];
}

export interface PlaylistItemResponseDto {
  id: string;
  playlistId: string;
  mediaId: string;
  sortOrder: number;
  duration: number | null;
  transitionType: string | null;
  isActive: boolean;
  isForced: boolean;
  sourceType: string;
  createdAt: string;
  media?: MediaResponseDto;
}

// ========== Media DTOs ==========
export interface CreateMediaDto {
  name: string;
  description?: string;
  mediaType: 'video' | 'image' | 'html' | 'text' | 'rich_text' | 'link';
  sourceType: 'upload' | 'youtube' | 'vimeo' | 'url' | 'cms';
  sourceUrl: string;
  embedId?: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  fileSize?: number;
  mimeType?: string;
  content?: string;
  tags?: string[];
  category?: string;
  metadata?: Record<string, any>;
}

export interface UpdateMediaDto {
  name?: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: number;
  content?: string;
  tags?: string[];
  category?: string;
  status?: 'active' | 'inactive' | 'processing';
  metadata?: Record<string, any>;
}

export interface MediaQueryDto {
  page?: number;
  limit?: number;
  mediaType?: 'video' | 'image' | 'html' | 'text' | 'rich_text' | 'link';
  sourceType?: 'upload' | 'youtube' | 'vimeo' | 'url' | 'cms';
  status?: 'active' | 'inactive' | 'processing';
  category?: string;
  tags?: string[];
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'mediaType';
  sortOrder?: 'asc' | 'desc';
}

export interface MediaResponseDto {
  id: string;
  serviceKey: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  mediaType: string;
  sourceType: string;
  sourceUrl: string;
  embedId: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  resolution: string | null;
  fileSize: number | null;
  mimeType: string | null;
  content: string | null;
  tags: string[];
  category: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ========== Schedule DTOs ==========
export interface CreateScheduleDto {
  name: string;
  channelId?: string;
  playlistId: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  validFrom?: string;
  validUntil?: string;
  priority?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateScheduleDto {
  name?: string;
  channelId?: string;
  playlistId?: string;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  validFrom?: string;
  validUntil?: string;
  priority?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface ScheduleQueryDto {
  page?: number;
  limit?: number;
  channelId?: string;
  playlistId?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'priority' | 'startTime' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ScheduleResponseDto {
  id: string;
  serviceKey: string;
  organizationId: string | null;
  name: string;
  channelId: string | null;
  playlistId: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  validFrom: string | null;
  validUntil: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  playlist?: PlaylistResponseDto;
}

// ========== Active Content Resolution ==========
export interface ActiveContentRequestDto {
  channelId?: string;
  currentTime?: string; // ISO datetime, defaults to now
}

export interface ActiveContentResponseDto {
  playlist: PlaylistResponseDto | null;
  schedule: ScheduleResponseDto | null;
  items: PlaylistItemResponseDto[];
  resolvedAt: string;
  nextScheduleChange: string | null;
}
