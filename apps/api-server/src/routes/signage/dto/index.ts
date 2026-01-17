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

// ========== Sprint 2-3: Template DTOs ==========
export interface TemplateLayoutConfig {
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
  backgroundColor?: string;
  backgroundImage?: string;
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  layoutConfig: TemplateLayoutConfig;
  category?: string;
  tags?: string[];
  thumbnailUrl?: string;
  status?: 'active' | 'inactive' | 'draft';
  isPublic?: boolean;
  isSystem?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  layoutConfig?: TemplateLayoutConfig;
  category?: string;
  tags?: string[];
  thumbnailUrl?: string;
  status?: 'active' | 'inactive' | 'draft';
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

export interface TemplateQueryDto {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'draft';
  isPublic?: boolean;
  isSystem?: boolean;
  category?: string;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TemplateResponseDto {
  id: string;
  serviceKey: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  layoutConfig: TemplateLayoutConfig;
  category: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  status: string;
  isPublic: boolean;
  isSystem: boolean;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDetailResponseDto extends TemplateResponseDto {
  zones: TemplateZoneResponseDto[];
}

// ========== Template Zone DTOs ==========
export interface ZonePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: 'percent' | 'px';
}

export interface ZoneStyle {
  backgroundColor?: string;
  borderRadius?: number;
  padding?: number;
  overflow?: 'hidden' | 'visible' | 'scroll';
}

export interface CreateTemplateZoneDto {
  name: string;
  zoneKey?: string;
  zoneType: 'media' | 'text' | 'clock' | 'weather' | 'ticker' | 'custom';
  position: ZonePosition;
  zIndex?: number;
  sortOrder?: number;
  style?: ZoneStyle;
  defaultPlaylistId?: string;
  defaultMediaId?: string;
  settings?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateTemplateZoneDto {
  name?: string;
  zoneKey?: string;
  zoneType?: 'media' | 'text' | 'clock' | 'weather' | 'ticker' | 'custom';
  position?: ZonePosition;
  zIndex?: number;
  sortOrder?: number;
  style?: ZoneStyle;
  defaultPlaylistId?: string;
  defaultMediaId?: string;
  settings?: Record<string, any>;
  isActive?: boolean;
}

export interface TemplateZoneResponseDto {
  id: string;
  templateId: string;
  name: string;
  zoneKey: string | null;
  zoneType: string;
  position: ZonePosition;
  zIndex: number;
  sortOrder: number;
  style: ZoneStyle;
  defaultPlaylistId: string | null;
  defaultMediaId: string | null;
  settings: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ========== Content Block DTOs ==========
export interface ContentBlockSettings {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
  animation?: string;
  animationDuration?: number;
  [key: string]: any;
}

export interface CreateContentBlockDto {
  name: string;
  description?: string;
  blockType: 'text' | 'image' | 'video' | 'html' | 'clock' | 'weather' | 'ticker' | 'qr' | 'custom';
  content?: string;
  mediaId?: string;
  settings?: ContentBlockSettings;
  status?: 'active' | 'inactive' | 'draft';
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateContentBlockDto {
  name?: string;
  description?: string;
  blockType?: 'text' | 'image' | 'video' | 'html' | 'clock' | 'weather' | 'ticker' | 'qr' | 'custom';
  content?: string;
  mediaId?: string;
  settings?: ContentBlockSettings;
  status?: 'active' | 'inactive' | 'draft';
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ContentBlockQueryDto {
  page?: number;
  limit?: number;
  blockType?: string;
  status?: 'active' | 'inactive' | 'draft';
  category?: string;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'blockType';
  sortOrder?: 'asc' | 'desc';
}

export interface ContentBlockResponseDto {
  id: string;
  serviceKey: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  blockType: string;
  content: string | null;
  mediaId: string | null;
  settings: ContentBlockSettings;
  status: string;
  category: string | null;
  tags: string[];
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ========== Layout Preset DTOs ==========
export interface PresetZoneData {
  name: string;
  zoneType: string;
  position: ZonePosition;
  zIndex: number;
}

export interface LayoutPresetData {
  orientation: 'landscape' | 'portrait';
  aspectRatio: string;
  zones: PresetZoneData[];
}

export interface CreateLayoutPresetDto {
  name: string;
  description?: string;
  presetData: LayoutPresetData;
  category?: string;
  tags?: string[];
  thumbnailUrl?: string;
  isSystem?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  metadata?: Record<string, any>;
}

export interface UpdateLayoutPresetDto {
  name?: string;
  description?: string;
  presetData?: LayoutPresetData;
  category?: string;
  tags?: string[];
  thumbnailUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  metadata?: Record<string, any>;
}

export interface LayoutPresetQueryDto {
  page?: number;
  limit?: number;
  category?: string;
  isSystem?: boolean;
  isActive?: boolean;
  search?: string;
  sortBy?: 'name' | 'sortOrder' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface LayoutPresetResponseDto {
  id: string;
  serviceKey: string | null;
  name: string;
  description: string | null;
  presetData: LayoutPresetData;
  category: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ========== Media Upload DTOs ==========
export interface PresignedUploadRequestDto {
  fileName: string;
  mimeType: string;
  fileSize: number;
  mediaType: 'video' | 'image';
}

export interface PresignedUploadResponseDto {
  uploadUrl: string;
  downloadUrl: string;
  fields?: Record<string, string>;
  expiresAt: string;
}

export interface ProcessMediaRequestDto {
  sourceUrl: string;
  generateThumbnail?: boolean;
  extractMetadata?: boolean;
}

export interface ProcessMediaResponseDto {
  thumbnailUrl: string | null;
  duration: number | null;
  resolution: string | null;
  fileSize: number | null;
  mimeType: string | null;
}

// ========== Media Library DTOs ==========
export interface MediaLibraryQueryDto {
  page?: number;
  limit?: number;
  source?: 'platform' | 'organization' | 'supplier' | 'all';
  mediaType?: 'video' | 'image' | 'html' | 'text';
  category?: string;
  search?: string;
}

export interface MediaLibraryResponseDto {
  platform: MediaResponseDto[];
  organization: MediaResponseDto[];
  supplier: MediaResponseDto[];
  meta: PaginationMeta;
}

// ========== AI Generation DTOs ==========
export interface AiGenerateRequestDto {
  prompt: string;
  templateType: 'banner' | 'card' | 'poster' | 'slide';
  style?: 'modern' | 'classic' | 'minimal' | 'vibrant';
  width?: number;
  height?: number;
  metadata?: Record<string, any>;
}

export interface AiGenerateResponseDto {
  contentBlockId: string;
  generatedContent: string;
  thumbnailUrl: string | null;
  generationLog: {
    prompt: string;
    model: string;
    tokensUsed: number;
    generatedAt: string;
  };
}

// ========== Template Generation DTOs ==========
export interface GenerateFromTemplateDto {
  templateId: string;
  variables: Record<string, any>;
  outputName?: string;
}

export interface TemplatePreviewDto {
  templateId: string;
  variables: Record<string, any>;
  zoneOverrides?: Record<string, {
    playlistId?: string;
    mediaId?: string;
    content?: string;
  }>;
}

export interface TemplatePreviewResponseDto {
  previewHtml: string;
  previewUrl: string | null;
  compiledAt: string;
}

// ========== Schedule Calendar DTOs ==========
export interface ScheduleCalendarQueryDto {
  channelId?: string;
  startDate: string;
  endDate: string;
}

export interface ScheduleCalendarEventDto {
  scheduleId: string;
  scheduleName: string;
  playlistId: string;
  playlistName: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  priority: number;
  date: string;
}

export interface ScheduleCalendarResponseDto {
  events: ScheduleCalendarEventDto[];
  startDate: string;
  endDate: string;
}
