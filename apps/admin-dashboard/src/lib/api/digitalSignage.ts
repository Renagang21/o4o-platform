/**
 * Digital Signage API Client
 *
 * API client for Digital Signage Core App
 * Phase 6: Operations/Management UI
 */

import { authClient } from '@o4o/auth-client';

const API_BASE = '/api/signage';

// ===== Types =====

// Media Types
export type MediaType = 'youtube' | 'vimeo' | 'internal_video' | 'image';

export interface MediaSource {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  metadata: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaListItem {
  id: string;
  mediaListId: string;
  mediaSourceId: string;
  mediaSource?: MediaSource;
  order: number;
  duration?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MediaList {
  id: string;
  name: string;
  description?: string;
  items: MediaListItem[];
  totalDuration: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Display Types
export type DisplayStatus = 'online' | 'offline' | 'unknown';

export interface Display {
  id: string;
  name: string;
  description?: string;
  location?: string;
  deviceId?: string;
  status: DisplayStatus;
  lastHeartbeat?: string;
  metadata: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SlotStatus = 'idle' | 'playing' | 'paused' | 'error';

export interface DisplaySlot {
  id: string;
  displayId: string;
  display?: Display;
  name: string;
  position?: string;
  status: SlotStatus;
  currentActionId?: string;
  metadata: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Schedule Types
export type ScheduleType = 'once' | 'daily' | 'weekly' | 'monthly';
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface Schedule {
  id: string;
  name: string;
  description?: string;
  mediaListId: string;
  mediaList?: MediaList;
  displaySlotId: string;
  displaySlot?: DisplaySlot;
  scheduleType: ScheduleType;
  startTime: string;
  endTime?: string;
  daysOfWeek?: DayOfWeek[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Action Types
export type ExecutionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'stopped' | 'failed';

export interface ActionExecution {
  id: string;
  scheduleId?: string;
  schedule?: Schedule;
  mediaListId: string;
  mediaList?: MediaList;
  displaySlotId: string;
  displaySlot?: DisplaySlot;
  status: ExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  currentItemIndex: number;
  error?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// DTOs
export interface CreateMediaSourceDto {
  name: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateMediaSourceDto {
  name?: string;
  url?: string;
  thumbnailUrl?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface CreateMediaListDto {
  name: string;
  description?: string;
  items?: { mediaSourceId: string; duration?: number; order: number }[];
}

export interface UpdateMediaListDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateDisplayDto {
  name: string;
  description?: string;
  location?: string;
  deviceId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateDisplayDto {
  name?: string;
  description?: string;
  location?: string;
  deviceId?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface CreateDisplaySlotDto {
  displayId: string;
  name: string;
  position?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateDisplaySlotDto {
  name?: string;
  position?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface CreateScheduleDto {
  name: string;
  description?: string;
  mediaListId: string;
  displaySlotId: string;
  scheduleType: ScheduleType;
  startTime: string;
  endTime?: string;
  daysOfWeek?: DayOfWeek[];
  priority?: number;
}

export interface UpdateScheduleDto {
  name?: string;
  description?: string;
  mediaListId?: string;
  displaySlotId?: string;
  scheduleType?: ScheduleType;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: DayOfWeek[];
  priority?: number;
  isActive?: boolean;
}

export interface ExecuteActionDto {
  mediaListId: string;
  displaySlotId: string;
  scheduleId?: string;
}

// API Response Types
interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

// ===== Media Source API =====

export const mediaSourceApi = {
  async list(): Promise<ApiResponse<PaginatedResponse<MediaSource>>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/media-sources`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list media sources:', error);
      return { success: false, error: 'Failed to list media sources' };
    }
  },

  async get(id: string): Promise<ApiResponse<MediaSource>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/media-sources/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get media source:', error);
      return { success: false, error: 'Failed to get media source' };
    }
  },

  async create(dto: CreateMediaSourceDto): Promise<ApiResponse<MediaSource>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/media-sources`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create media source:', error);
      return { success: false, error: 'Failed to create media source' };
    }
  },

  async update(id: string, dto: UpdateMediaSourceDto): Promise<ApiResponse<MediaSource>> {
    try {
      const response = await authClient.api.put(`${API_BASE}/media-sources/${id}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update media source:', error);
      return { success: false, error: 'Failed to update media source' };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${API_BASE}/media-sources/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete media source:', error);
      return { success: false, error: 'Failed to delete media source' };
    }
  },
};

// ===== Media List API =====

export const mediaListApi = {
  async list(): Promise<ApiResponse<PaginatedResponse<MediaList>>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/media-lists`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list media lists:', error);
      return { success: false, error: 'Failed to list media lists' };
    }
  },

  async get(id: string): Promise<ApiResponse<MediaList>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/media-lists/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get media list:', error);
      return { success: false, error: 'Failed to get media list' };
    }
  },

  async create(dto: CreateMediaListDto): Promise<ApiResponse<MediaList>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/media-lists`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create media list:', error);
      return { success: false, error: 'Failed to create media list' };
    }
  },

  async update(id: string, dto: UpdateMediaListDto): Promise<ApiResponse<MediaList>> {
    try {
      const response = await authClient.api.put(`${API_BASE}/media-lists/${id}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update media list:', error);
      return { success: false, error: 'Failed to update media list' };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${API_BASE}/media-lists/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete media list:', error);
      return { success: false, error: 'Failed to delete media list' };
    }
  },

  async addItem(listId: string, item: { mediaSourceId: string; duration?: number; order: number }): Promise<ApiResponse<MediaListItem>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/media-list-items`, {
        mediaListId: listId,
        ...item,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to add item to media list:', error);
      return { success: false, error: 'Failed to add item' };
    }
  },

  async removeItem(itemId: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${API_BASE}/media-list-items/${itemId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to remove item from media list:', error);
      return { success: false, error: 'Failed to remove item' };
    }
  },

  async reorderItems(listId: string, itemIds: string[]): Promise<ApiResponse<void>> {
    try {
      await authClient.api.put(`${API_BASE}/media-lists/${listId}/reorder`, { itemIds });
      return { success: true };
    } catch (error) {
      console.error('Failed to reorder items:', error);
      return { success: false, error: 'Failed to reorder items' };
    }
  },
};

// ===== Display API =====

export const displayApi = {
  async list(): Promise<ApiResponse<PaginatedResponse<Display>>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/displays`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list displays:', error);
      return { success: false, error: 'Failed to list displays' };
    }
  },

  async get(id: string): Promise<ApiResponse<Display>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/displays/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get display:', error);
      return { success: false, error: 'Failed to get display' };
    }
  },

  async create(dto: CreateDisplayDto): Promise<ApiResponse<Display>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/displays`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create display:', error);
      return { success: false, error: 'Failed to create display' };
    }
  },

  async update(id: string, dto: UpdateDisplayDto): Promise<ApiResponse<Display>> {
    try {
      const response = await authClient.api.put(`${API_BASE}/displays/${id}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update display:', error);
      return { success: false, error: 'Failed to update display' };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${API_BASE}/displays/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete display:', error);
      return { success: false, error: 'Failed to delete display' };
    }
  },
};

// ===== Display Slot API =====

export const displaySlotApi = {
  async list(displayId?: string): Promise<ApiResponse<PaginatedResponse<DisplaySlot>>> {
    try {
      const url = displayId
        ? `${API_BASE}/display-slots?displayId=${displayId}`
        : `${API_BASE}/display-slots`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list display slots:', error);
      return { success: false, error: 'Failed to list display slots' };
    }
  },

  async get(id: string): Promise<ApiResponse<DisplaySlot>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/display-slots/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get display slot:', error);
      return { success: false, error: 'Failed to get display slot' };
    }
  },

  async create(dto: CreateDisplaySlotDto): Promise<ApiResponse<DisplaySlot>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/display-slots`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create display slot:', error);
      return { success: false, error: 'Failed to create display slot' };
    }
  },

  async update(id: string, dto: UpdateDisplaySlotDto): Promise<ApiResponse<DisplaySlot>> {
    try {
      const response = await authClient.api.put(`${API_BASE}/display-slots/${id}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update display slot:', error);
      return { success: false, error: 'Failed to update display slot' };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${API_BASE}/display-slots/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete display slot:', error);
      return { success: false, error: 'Failed to delete display slot' };
    }
  },
};

// ===== Schedule API =====

export const scheduleApi = {
  async list(): Promise<ApiResponse<PaginatedResponse<Schedule>>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/schedules`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list schedules:', error);
      return { success: false, error: 'Failed to list schedules' };
    }
  },

  async get(id: string): Promise<ApiResponse<Schedule>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/schedules/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get schedule:', error);
      return { success: false, error: 'Failed to get schedule' };
    }
  },

  async create(dto: CreateScheduleDto): Promise<ApiResponse<Schedule>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/schedules`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create schedule:', error);
      return { success: false, error: 'Failed to create schedule' };
    }
  },

  async update(id: string, dto: UpdateScheduleDto): Promise<ApiResponse<Schedule>> {
    try {
      const response = await authClient.api.put(`${API_BASE}/schedules/${id}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update schedule:', error);
      return { success: false, error: 'Failed to update schedule' };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${API_BASE}/schedules/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      return { success: false, error: 'Failed to delete schedule' };
    }
  },
};

// ===== Action Execution API =====

export const actionApi = {
  async listExecutions(): Promise<ApiResponse<PaginatedResponse<ActionExecution>>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/action-executions`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list action executions:', error);
      return { success: false, error: 'Failed to list action executions' };
    }
  },

  async getExecution(id: string): Promise<ApiResponse<ActionExecution>> {
    try {
      const response = await authClient.api.get(`${API_BASE}/action-executions/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get action execution:', error);
      return { success: false, error: 'Failed to get action execution' };
    }
  },

  async execute(dto: ExecuteActionDto): Promise<ApiResponse<ActionExecution>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/actions/execute`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to execute action:', error);
      return { success: false, error: 'Failed to execute action' };
    }
  },

  async stop(executionId: string): Promise<ApiResponse<ActionExecution>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/actions/${executionId}/stop`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to stop action:', error);
      return { success: false, error: 'Failed to stop action' };
    }
  },

  async pause(executionId: string): Promise<ApiResponse<ActionExecution>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/actions/${executionId}/pause`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to pause action:', error);
      return { success: false, error: 'Failed to pause action' };
    }
  },

  async resume(executionId: string): Promise<ApiResponse<ActionExecution>> {
    try {
      const response = await authClient.api.post(`${API_BASE}/actions/${executionId}/resume`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to resume action:', error);
      return { success: false, error: 'Failed to resume action' };
    }
  },

  async listWithFilters(params: {
    status?: ExecutionStatus;
    displaySlotId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<PaginatedResponse<ActionExecution>>> {
    try {
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.append('status', params.status);
      if (params.displaySlotId) searchParams.append('displaySlotId', params.displaySlotId);
      if (params.startDate) searchParams.append('startDate', params.startDate);
      if (params.endDate) searchParams.append('endDate', params.endDate);
      const query = searchParams.toString();
      const url = query ? `${API_BASE}/action-executions?${query}` : `${API_BASE}/action-executions`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list action executions with filters:', error);
      return { success: false, error: 'Failed to list action executions' };
    }
  },
};

// ===== Operations API (Phase 12) =====

export interface OperationsSummary {
  totalDisplays: number;
  onlineDisplays: number;
  offlineDisplays: number;
  runningActions: number;
  failedActionsLast24h: number;
  totalSlots: number;
  busySlots: number;
}

export interface OperationsStats {
  totalExecutions: number;
  totalRuntime: number; // in seconds
  failedCount: number;
  stoppedCount: number;
  completedCount: number;
}

export const operationsApi = {
  async getSummary(): Promise<ApiResponse<OperationsSummary>> {
    try {
      // Aggregate from existing APIs
      const [displaysRes, slotsRes, actionsRes] = await Promise.all([
        displayApi.list(),
        displaySlotApi.list(),
        actionApi.listExecutions(),
      ]);

      if (!displaysRes.success || !slotsRes.success || !actionsRes.success) {
        return { success: false, error: 'Failed to fetch data for summary' };
      }

      const displays = displaysRes.data?.data || [];
      const slots = slotsRes.data?.data || [];
      const actions = actionsRes.data?.data || [];

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const summary: OperationsSummary = {
        totalDisplays: displays.length,
        onlineDisplays: displays.filter(d => d.status === 'online').length,
        offlineDisplays: displays.filter(d => d.status === 'offline').length,
        runningActions: actions.filter(a => a.status === 'running').length,
        failedActionsLast24h: actions.filter(a =>
          a.status === 'failed' &&
          a.createdAt && new Date(a.createdAt) >= last24h
        ).length,
        totalSlots: slots.length,
        busySlots: slots.filter(s => s.status === 'playing' || s.status === 'paused').length,
      };

      return { success: true, data: summary };
    } catch (error) {
      console.error('Failed to get operations summary:', error);
      return { success: false, error: 'Failed to get operations summary' };
    }
  },

  async getStats(params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<OperationsStats>> {
    try {
      const actionsRes = await actionApi.listExecutions();
      if (!actionsRes.success) {
        return { success: false, error: 'Failed to fetch actions for stats' };
      }

      let actions = actionsRes.data?.data || [];

      // Filter by date range if provided
      if (params?.startDate) {
        const start = new Date(params.startDate);
        actions = actions.filter(a => a.createdAt && new Date(a.createdAt) >= start);
      }
      if (params?.endDate) {
        const end = new Date(params.endDate);
        actions = actions.filter(a => a.createdAt && new Date(a.createdAt) <= end);
      }

      // Calculate total runtime
      let totalRuntime = 0;
      actions.forEach(a => {
        if (a.startedAt) {
          const start = new Date(a.startedAt);
          const end = a.completedAt ? new Date(a.completedAt) : new Date();
          totalRuntime += Math.floor((end.getTime() - start.getTime()) / 1000);
        }
      });

      const stats: OperationsStats = {
        totalExecutions: actions.length,
        totalRuntime,
        failedCount: actions.filter(a => a.status === 'failed').length,
        stoppedCount: actions.filter(a => a.status === 'stopped').length,
        completedCount: actions.filter(a => a.status === 'completed').length,
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('Failed to get operations stats:', error);
      return { success: false, error: 'Failed to get operations stats' };
    }
  },

  async getFailedActions(): Promise<ApiResponse<ActionExecution[]>> {
    try {
      const actionsRes = await actionApi.listExecutions();
      if (!actionsRes.success) {
        return { success: false, error: 'Failed to fetch actions' };
      }

      const failedActions = (actionsRes.data?.data || [])
        .filter(a => a.status === 'failed')
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

      return { success: true, data: failedActions };
    } catch (error) {
      console.error('Failed to get failed actions:', error);
      return { success: false, error: 'Failed to get failed actions' };
    }
  },

  async getOfflineDisplays(): Promise<ApiResponse<Display[]>> {
    try {
      const displaysRes = await displayApi.list();
      if (!displaysRes.success) {
        return { success: false, error: 'Failed to fetch displays' };
      }

      const offlineDisplays = (displaysRes.data?.data || [])
        .filter(d => d.status === 'offline')
        .sort((a, b) => {
          const dateA = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0;
          const dateB = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
          return dateB - dateA;
        });

      return { success: true, data: offlineDisplays };
    } catch (error) {
      console.error('Failed to get offline displays:', error);
      return { success: false, error: 'Failed to get offline displays' };
    }
  },

  async getDisplaysWithSlots(): Promise<ApiResponse<(Display & { slots: DisplaySlot[] })[]>> {
    try {
      const [displaysRes, slotsRes] = await Promise.all([
        displayApi.list(),
        displaySlotApi.list(),
      ]);

      if (!displaysRes.success || !slotsRes.success) {
        return { success: false, error: 'Failed to fetch data' };
      }

      const displays = displaysRes.data?.data || [];
      const slots = slotsRes.data?.data || [];

      const displaysWithSlots = displays.map(display => ({
        ...display,
        slots: slots.filter(s => s.displayId === display.id),
      }));

      return { success: true, data: displaysWithSlots };
    } catch (error) {
      console.error('Failed to get displays with slots:', error);
      return { success: false, error: 'Failed to get displays with slots' };
    }
  },
};
