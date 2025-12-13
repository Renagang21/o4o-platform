/**
 * Digital Signage Core DTOs
 */

// Media Source DTOs
export interface CreateMediaSourceDto {
  organizationId: string;
  ownerUserId?: string;
  name: string;
  sourceType: string;
  sourceUrl?: string;
  mimeType?: string;
  durationSeconds?: number;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateMediaSourceDto extends Partial<Omit<CreateMediaSourceDto, 'organizationId'>> {}

// Media List DTOs
export interface CreateMediaListDto {
  organizationId: string;
  ownerUserId?: string;
  name: string;
  slug?: string;
  description?: string;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateMediaListDto extends Partial<Omit<CreateMediaListDto, 'organizationId'>> {}

// Media List Item DTOs
export interface CreateMediaListItemDto {
  mediaListId: string;
  mediaSourceId: string;
  sortOrder?: number;
  displayDurationSeconds?: number;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateMediaListItemDto extends Partial<Omit<CreateMediaListItemDto, 'mediaListId' | 'mediaSourceId'>> {}

// Display DTOs
export interface CreateDisplayDto {
  organizationId: string;
  ownerUserId?: string;
  name: string;
  deviceCode?: string;
  status?: string;
  widthPx?: number;
  heightPx?: number;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateDisplayDto extends Partial<Omit<CreateDisplayDto, 'organizationId'>> {}

// Display Slot DTOs
export interface CreateDisplaySlotDto {
  displayId: string;
  name: string;
  positionX?: number;
  positionY?: number;
  widthPx?: number;
  heightPx?: number;
  zIndex?: number;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateDisplaySlotDto extends Partial<Omit<CreateDisplaySlotDto, 'displayId'>> {}

// Schedule DTOs
export interface CreateScheduleDto {
  organizationId: string;
  ownerUserId?: string;
  name: string;
  displaySlotId?: string;
  mediaListId?: string;
  startTime?: Date;
  endTime?: Date;
  recurrenceRule?: string;
  priority?: number;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateScheduleDto extends Partial<Omit<CreateScheduleDto, 'organizationId'>> {}

// List Query Options
export interface ListQueryOptions {
  organizationId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}
