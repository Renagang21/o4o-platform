import { api } from '../base';
import { apiEndpoints } from '@/config/apps.config';

export interface SignageStats {
  totalDisplays: number;
  activeDisplays: number;
  totalContent: number;
  activeSchedules: number;
  totalPlaylists: number;
}

export interface SignageDisplay {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'error';
  lastSeen?: string;
  resolution: string;
  orientation: 'landscape' | 'portrait';
  currentContent?: {
    id: string;
    name: string;
    type: 'image' | 'video' | 'web' | 'playlist';
  };
  schedule?: {
    id: string;
    name: string;
  };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SignageContent {
  id: string;
  name: string;
  type: 'image' | 'video' | 'web' | 'widget';
  url?: string;
  thumbnailUrl?: string;
  duration?: number; // in seconds
  fileSize?: number; // in bytes
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
  };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SignagePlaylist {
  id: string;
  name: string;
  description?: string;
  items: Array<{
    contentId: string;
    order: number;
    duration?: number; // override content duration
    transition?: 'fade' | 'slide' | 'none';
  }>;
  totalDuration: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignageSchedule {
  id: string;
  name: string;
  displayIds: string[];
  playlistId?: string;
  contentId?: string;
  startDate: string;
  endDate?: string;
  timeSlots?: Array<{
    startTime: string; // HH:mm format
    endTime: string;
    daysOfWeek: number[]; // 0-6, Sunday-Saturday
  }>;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

class SignageService {
  async getStats(): Promise<SignageStats> {
    const response = await api.get<SignageStats>(apiEndpoints.signage.stats);
    return response.data;
  }

  // Display Management
  async getDisplays(params?: {
    page?: number;
    limit?: number;
    status?: 'online' | 'offline' | 'error';
    search?: string;
  }) {
    const response = await api.get(apiEndpoints.signage.displays, { params });
    return response.data;
  }

  async getDisplay(id: string): Promise<SignageDisplay> {
    const response = await api.get<SignageDisplay>(`${apiEndpoints.signage.displays}/${id}`);
    return response.data;
  }

  async createDisplay(data: {
    name: string;
    location: string;
    resolution: string;
    orientation: 'landscape' | 'portrait';
    tags?: string[];
  }): Promise<SignageDisplay> {
    const response = await api.post<SignageDisplay>(apiEndpoints.signage.displays, data);
    return response.data;
  }

  async updateDisplay(id: string, data: Partial<SignageDisplay>): Promise<SignageDisplay> {
    const response = await api.put<SignageDisplay>(`${apiEndpoints.signage.displays}/${id}`, data);
    return response.data;
  }

  async deleteDisplay(id: string): Promise<void> {
    await api.delete(`${apiEndpoints.signage.displays}/${id}`);
  }

  async rebootDisplay(id: string): Promise<void> {
    await api.post(`${apiEndpoints.signage.displays}/${id}/reboot`);
  }

  async takeScreenshot(id: string): Promise<{ url: string }> {
    const response = await api.post<{ url: string }>(`${apiEndpoints.signage.displays}/${id}/screenshot`);
    return response.data;
  }

  // Content Management
  async getContent(params?: {
    page?: number;
    limit?: number;
    type?: 'image' | 'video' | 'web' | 'widget';
    search?: string;
  }) {
    const response = await api.get(apiEndpoints.signage.content, { params });
    return response.data;
  }

  async uploadContent(file: File, metadata?: {
    name?: string;
    tags?: string[];
  }): Promise<SignageContent> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.name) formData.append('name', metadata.name);
    if (metadata?.tags) formData.append('tags', JSON.stringify(metadata.tags));

    const response = await api.post<SignageContent>(apiEndpoints.signage.content, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteContent(id: string): Promise<void> {
    await api.delete(`${apiEndpoints.signage.content}/${id}`);
  }

  // Playlist Management
  async getPlaylists(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const response = await api.get(apiEndpoints.signage.playlists, { params });
    return response.data;
  }

  async createPlaylist(data: {
    name: string;
    description?: string;
    items: Array<{
      contentId: string;
      duration?: number;
      transition?: 'fade' | 'slide' | 'none';
    }>;
  }): Promise<SignagePlaylist> {
    const response = await api.post<SignagePlaylist>(apiEndpoints.signage.playlists, data);
    return response.data;
  }

  async updatePlaylist(id: string, data: Partial<SignagePlaylist>): Promise<SignagePlaylist> {
    const response = await api.put<SignagePlaylist>(`${apiEndpoints.signage.playlists}/${id}`, data);
    return response.data;
  }

  async deletePlaylist(id: string): Promise<void> {
    await api.delete(`${apiEndpoints.signage.playlists}/${id}`);
  }

  // Schedule Management
  async getSchedules(params?: {
    page?: number;
    limit?: number;
    displayId?: string;
    active?: boolean;
  }) {
    const response = await api.get(apiEndpoints.signage.schedules, { params });
    return response.data;
  }

  async createSchedule(data: {
    name: string;
    displayIds: string[];
    playlistId?: string;
    contentId?: string;
    startDate: string;
    endDate?: string;
    timeSlots?: Array<{
      startTime: string;
      endTime: string;
      daysOfWeek: number[];
    }>;
    priority?: number;
  }): Promise<SignageSchedule> {
    const response = await api.post<SignageSchedule>(apiEndpoints.signage.schedules, data);
    return response.data;
  }

  async updateSchedule(id: string, data: Partial<SignageSchedule>): Promise<SignageSchedule> {
    const response = await api.put<SignageSchedule>(`${apiEndpoints.signage.schedules}/${id}`, data);
    return response.data;
  }

  async deleteSchedule(id: string): Promise<void> {
    await api.delete(`${apiEndpoints.signage.schedules}/${id}`);
  }

  // Bulk operations
  async assignContentToDisplays(contentId: string, displayIds: string[]): Promise<void> {
    await api.post(`${apiEndpoints.signage.displays}/bulk/assign`, {
      contentId,
      displayIds,
    });
  }

  async updateDisplaysStatus(displayIds: string[], status: 'online' | 'offline'): Promise<void> {
    await api.post(`${apiEndpoints.signage.displays}/bulk/status`, {
      displayIds,
      status,
    });
  }
}

export const signageService = new SignageService();