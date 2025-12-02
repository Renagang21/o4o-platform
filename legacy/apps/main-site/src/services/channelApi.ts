/**
 * Channel Management API
 * Phase PD-9-UI: Multichannel RPA Frontend
 */

import { authClient } from '@o4o/auth-client';

export interface ExternalChannel {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive' | 'maintenance';
  description: string | null;
  metadata: Record<string, any> | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SellerChannelAccount {
  id: string;
  sellerId: string;
  channelCode: string;
  displayName: string;
  credentials: Record<string, any> | null;
  metadata: Record<string, any> | null;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
  channel?: ExternalChannel;
}

export interface ChannelProductLink {
  id: string;
  sellerId: string;
  channelAccountId: string;
  sellerProductId: string;
  externalProductId: string | null;
  externalUrl: string | null;
  status: 'draft' | 'exported' | 'failed' | 'inactive' | 'out_of_sync';
  lastSyncAt: string | null;
  lastErrorMessage: string | null;
  exportCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelAccountDto {
  channelCode: string;
  displayName: string;
  credentials?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ExportProductsDto {
  sellerProductIds: string[];
  linkIds?: string[];
  exportAll?: boolean;
}

export interface ImportOrdersDto {
  since?: string; // ISO date string
  limit?: number;
}

export class ChannelApi {
  /**
   * Get list of available external channels
   */
  static async listAvailableChannels(): Promise<ExternalChannel[]> {
    const response = await authClient.api.get('/channels');
    return response.data.data || [];
  }

  /**
   * Get seller's channel accounts
   */
  static async getChannelAccounts(): Promise<SellerChannelAccount[]> {
    const response = await authClient.api.get('/channels/accounts');
    return response.data.data || [];
  }

  /**
   * Create new channel account
   */
  static async createChannelAccount(
    data: CreateChannelAccountDto
  ): Promise<SellerChannelAccount> {
    const response = await authClient.api.post('/channels/accounts', data);
    return response.data.data;
  }

  /**
   * Update channel account
   */
  static async updateChannelAccount(
    accountId: string,
    data: Partial<CreateChannelAccountDto>
  ): Promise<SellerChannelAccount> {
    const response = await authClient.api.put(`/channels/accounts/${accountId}`, data);
    return response.data.data;
  }

  /**
   * Delete channel account
   */
  static async deleteChannelAccount(accountId: string): Promise<void> {
    await authClient.api.delete(`/channels/accounts/${accountId}`);
  }

  /**
   * Get product links for a channel account
   */
  static async getProductLinks(accountId: string): Promise<ChannelProductLink[]> {
    const response = await authClient.api.get(`/channels/accounts/${accountId}/products`);
    return response.data.data || [];
  }

  /**
   * Create product links (prepare for export)
   */
  static async createProductLinks(
    accountId: string,
    sellerProductIds: string[]
  ): Promise<ChannelProductLink[]> {
    const response = await authClient.api.post(`/channels/accounts/${accountId}/products`, {
      sellerProductIds,
    });
    return response.data.data || [];
  }

  /**
   * Export products to channel
   */
  static async exportProducts(
    accountId: string,
    data: ExportProductsDto
  ): Promise<{
    successful: number;
    failed: number;
    results: Array<{
      linkId: string;
      status: 'success' | 'failed';
      message?: string;
    }>;
  }> {
    const response = await authClient.api.post(
      `/channels/accounts/${accountId}/products/export`,
      data
    );
    return response.data.data;
  }

  /**
   * Delete product link
   */
  static async deleteProductLink(linkId: string): Promise<void> {
    await authClient.api.delete(`/channels/products/links/${linkId}`);
  }

  /**
   * Import orders from channel
   */
  static async importOrders(
    accountId: string,
    data: ImportOrdersDto = {}
  ): Promise<{
    imported: number;
    skipped: number;
    failed: number;
    details: Array<{
      externalOrderId: string;
      status: 'imported' | 'skipped' | 'failed';
      orderId?: string;
      linkId?: string;
      reason?: string;
    }>;
  }> {
    const response = await authClient.api.post(
      `/channels/accounts/${accountId}/orders/import`,
      data
    );
    return response.data.data;
  }

  /**
   * Get import statistics for a channel account
   */
  static async getImportStats(accountId: string): Promise<{
    total: number;
    imported: number;
    failed: number;
    pending: number;
  }> {
    const response = await authClient.api.get(`/channels/accounts/${accountId}/stats`);
    return response.data.data;
  }
}
