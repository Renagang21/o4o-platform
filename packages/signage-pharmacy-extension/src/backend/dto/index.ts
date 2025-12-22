/**
 * Pharmacy Signage DTOs
 *
 * Data Transfer Objects for pharmacy signage extension.
 * These DTOs wrap Core entities for pharmacy-specific use cases.
 */

// ==================== Content DTOs ====================

export interface PharmacyContentDto {
  id: string;
  name: string;
  sourceType: 'url' | 'file' | 'stream';
  sourceUrl: string | null;
  mimeType: string | null;
  durationSeconds: number | null;
  category: ContentCategory;
  provider: string | null;
  isSelected: boolean;
  thumbnailUrl?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type ContentCategory =
  | 'health-info'      // 건강정보
  | 'product-promo'    // 제품홍보
  | 'announcement'     // 안내/공지
  | 'seasonal'         // 시즌 콘텐츠
  | 'other';           // 기타

export interface ContentFilterDto {
  category?: ContentCategory;
  provider?: string;
  search?: string;
  selectedOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface ContentSelectionDto {
  contentId: string;
  selected: boolean;
}

// ==================== Playlist DTOs ====================

export interface PharmacyPlaylistDto {
  id: string;
  name: string;
  description: string | null;
  items: PlaylistItemDto[];
  totalDuration: number;
  loop: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaylistItemDto {
  id: string;
  contentId: string;
  contentName: string;
  position: number;
  durationSeconds: number;
  transitionEffect: TransitionEffect;
}

export type TransitionEffect = 'none' | 'fade' | 'slide' | 'zoom';

export interface CreatePlaylistDto {
  name: string;
  description?: string;
  loop?: boolean;
}

export interface UpdatePlaylistDto {
  name?: string;
  description?: string;
  loop?: boolean;
  isActive?: boolean;
}

export interface AddPlaylistItemDto {
  contentId: string;
  position?: number;
  durationSeconds?: number;
  transitionEffect?: TransitionEffect;
}

export interface ReorderPlaylistItemsDto {
  items: { id: string; position: number }[];
}

// ==================== Schedule DTOs ====================

export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export interface PharmacyScheduleDto {
  id: string;
  timeSlot: TimeSlot;
  playlistId: string;
  playlistName: string;
  startTime: string;  // HH:mm format
  endTime: string;    // HH:mm format
  isActive: boolean;
}

export interface CreateScheduleDto {
  timeSlot: TimeSlot;
  playlistId: string;
  startTime?: string;
  endTime?: string;
}

export interface UpdateScheduleDto {
  playlistId?: string;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
}

// Default time slot configuration
export const DEFAULT_TIME_SLOTS: Record<TimeSlot, { startTime: string; endTime: string }> = {
  morning: { startTime: '09:00', endTime: '12:00' },
  afternoon: { startTime: '12:00', endTime: '18:00' },
  evening: { startTime: '18:00', endTime: '21:00' },
};

// ==================== Quick Action DTOs ====================

export interface PharmacyQuickActionDto {
  playlistId: string;
  displaySlotId: string;
  executeMode: 'immediate' | 'replace';
  duration?: number;
  priority?: number;
}

export interface QuickActionResultDto {
  success: boolean;
  executionId?: string;
  status?: 'PENDING' | 'RUNNING' | 'REJECTED';
  error?: string;
}

// ==================== Display Status DTOs ====================

export interface PharmacyDisplayDto {
  id: string;
  name: string;
  deviceCode: string | null;
  status: 'online' | 'offline' | 'error';
  currentPlaylistId: string | null;
  currentPlaylistName: string | null;
  lastHeartbeat: Date | null;
  slots: DisplaySlotDto[];
}

export interface DisplaySlotDto {
  id: string;
  slotName: string;
  slotType: string;
  status: 'IDLE' | 'PLAYING' | 'PAUSED' | 'ERROR';
  currentActionId: string | null;
  isActive: boolean;
}

// ==================== Dashboard DTOs ====================

export interface PharmacyDashboardDto {
  displays: {
    total: number;
    online: number;
    offline: number;
  };
  playlists: {
    total: number;
    active: number;
  };
  currentlyPlaying: {
    displayId: string;
    displayName: string;
    playlistName: string;
  }[];
  scheduledToday: PharmacyScheduleDto[];
}
