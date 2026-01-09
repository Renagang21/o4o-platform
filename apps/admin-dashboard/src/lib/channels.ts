/**
 * Channel API Client for Admin Dashboard
 *
 * WO-P4-CHANNEL-IMPLEMENT-P0: Provides type-safe API functions for managing channels
 *
 * Channels represent "where CMS content is displayed" - the output context
 * that connects CMS Slots to physical/virtual destinations (TV, kiosk, web, signage).
 */

import api from './api';

// ========================================
// TYPES & INTERFACES
// ========================================

export type ChannelType = 'tv' | 'kiosk' | 'signage' | 'web';
export type ChannelStatus = 'active' | 'inactive' | 'maintenance';

export interface Channel {
  id: string;
  organizationId: string | null;
  serviceKey: string | null;
  name: string;
  code: string | null;
  description: string | null;
  type: ChannelType;
  slotKey: string;
  status: ChannelStatus;
  resolution: string | null;
  orientation: string;
  autoplay: boolean;
  refreshIntervalSec: number | null;
  defaultDurationSec: number;
  location: string | null;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelContent {
  slotId: string;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  content: {
    id: string;
    type: string;
    title: string;
    summary: string | null;
    body: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    linkText: string | null;
    metadata: Record<string, unknown>;
  };
}

export interface ChannelContentsResponse {
  success: boolean;
  data: ChannelContent[];
  channel: {
    id: string;
    name: string;
    code: string | null;
    type: ChannelType;
    status: ChannelStatus;
    slotKey: string;
    serviceKey: string | null;
    organizationId: string | null;
    resolution: string | null;
    orientation: string;
    autoplay: boolean;
    defaultDurationSec: number;
    refreshIntervalSec: number | null;
  };
  meta: {
    total: number;
    fetchedAt: string;
    message?: string;
  };
}

export interface CreateChannelData {
  serviceKey?: string;
  organizationId?: string;
  name: string;
  code?: string;
  description?: string;
  type: ChannelType;
  slotKey: string;
  status?: ChannelStatus;
  resolution?: string;
  orientation?: string;
  autoplay?: boolean;
  refreshIntervalSec?: number;
  defaultDurationSec?: number;
  location?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateChannelData extends Partial<CreateChannelData> {}

interface APIListResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// ========================================
// CHANNEL API
// ========================================

const channelAPI = {
  /**
   * List channels with optional filters
   */
  async listChannels(params?: {
    serviceKey?: string;
    organizationId?: string;
    type?: ChannelType;
    status?: ChannelStatus;
    slotKey?: string;
    limit?: number;
    offset?: number;
  }): Promise<APIListResponse<Channel>> {
    const response = await api.get('/channels', { params });
    return response.data;
  },

  /**
   * Get channel by ID
   */
  async getChannel(id: string): Promise<Channel> {
    const response = await api.get(`/channels/${id}`);
    return response.data.data;
  },

  /**
   * Get channel by code
   */
  async getChannelByCode(code: string): Promise<Channel> {
    const response = await api.get(`/channels/code/${code}`);
    return response.data.data;
  },

  /**
   * Create a new channel
   */
  async createChannel(data: CreateChannelData): Promise<Channel> {
    const response = await api.post('/channels', data);
    return response.data.data;
  },

  /**
   * Update a channel
   */
  async updateChannel(id: string, data: UpdateChannelData): Promise<Channel> {
    const response = await api.put(`/channels/${id}`, data);
    return response.data.data;
  },

  /**
   * Update channel status only
   */
  async updateChannelStatus(id: string, status: ChannelStatus): Promise<Channel> {
    const response = await api.patch(`/channels/${id}/status`, { status });
    return response.data.data;
  },

  /**
   * Delete a channel
   */
  async deleteChannel(id: string): Promise<void> {
    await api.delete(`/channels/${id}`);
  },

  /**
   * Get current contents for a channel
   * This is the KEY endpoint that shows what content is currently
   * available for this channel based on its slotKey and scope.
   */
  async getChannelContents(id: string): Promise<ChannelContentsResponse> {
    const response = await api.get(`/channels/${id}/contents`);
    return response.data;
  },
};

export default channelAPI;
