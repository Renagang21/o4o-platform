/**
 * Channel Management Service
 * Phase PD-9: Multichannel RPA 1차
 *
 * Handles seller channel account CRUD operations
 */

import AppDataSource from '../database/data-source.js';
import { SellerChannelAccount } from '../entities/SellerChannelAccount.js';
import { ExternalChannel } from '../entities/ExternalChannel.js';
import { channelConnectorRegistry } from '../channels/index.js';

export interface CreateChannelAccountDto {
  sellerId: string;
  channelCode: string;
  displayName: string;
  credentials?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateChannelAccountDto {
  displayName?: string;
  credentials?: Record<string, any>;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export class ChannelManagementService {
  private accountRepository = AppDataSource.getRepository(SellerChannelAccount);
  private channelRepository = AppDataSource.getRepository(ExternalChannel);

  /**
   * Get all channel accounts for a seller
   */
  async getSellerChannelAccounts(sellerId: string): Promise<SellerChannelAccount[]> {
    return this.accountRepository.find({
      where: { sellerId },
      relations: ['channel'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get single channel account by ID
   */
  async getChannelAccountById(id: string, sellerId: string): Promise<SellerChannelAccount> {
    const account = await this.accountRepository.findOne({
      where: { id, sellerId },
      relations: ['channel'],
    });

    if (!account) {
      throw new Error(`Channel account not found: ${id}`);
    }

    return account;
  }

  /**
   * Create new channel account
   */
  async createChannelAccount(data: CreateChannelAccountDto): Promise<SellerChannelAccount> {
    // Verify channel exists
    const channel = await this.channelRepository.findOne({
      where: { code: data.channelCode },
    });

    if (!channel) {
      throw new Error(`Channel not found: ${data.channelCode}`);
    }

    // Verify connector exists
    if (!channelConnectorRegistry.hasConnector(data.channelCode)) {
      throw new Error(`No connector available for channel: ${data.channelCode}`);
    }

    // Create account
    const account = this.accountRepository.create({
      sellerId: data.sellerId,
      channelCode: data.channelCode,
      displayName: data.displayName,
      credentials: data.credentials || null,
      metadata: data.metadata || null,
      isActive: true,
    });

    await this.accountRepository.save(account);

    // Load relations
    return this.getChannelAccountById(account.id, data.sellerId);
  }

  /**
   * Update channel account
   */
  async updateChannelAccount(
    id: string,
    sellerId: string,
    data: UpdateChannelAccountDto
  ): Promise<SellerChannelAccount> {
    const account = await this.getChannelAccountById(id, sellerId);

    if (data.displayName !== undefined) account.displayName = data.displayName;
    if (data.credentials !== undefined) account.credentials = data.credentials;
    if (data.metadata !== undefined) account.metadata = data.metadata;
    if (data.isActive !== undefined) account.isActive = data.isActive;

    await this.accountRepository.save(account);

    return this.getChannelAccountById(id, sellerId);
  }

  /**
   * Delete (deactivate) channel account
   */
  async deleteChannelAccount(id: string, sellerId: string): Promise<void> {
    const account = await this.getChannelAccountById(id, sellerId);

    // Soft delete - just deactivate
    account.isActive = false;
    await this.accountRepository.save(account);
  }

  /**
   * List all available channels
   */
  async listAvailableChannels(): Promise<ExternalChannel[]> {
    const { ChannelStatus } = await import('../entities/ExternalChannel.js');
    return this.channelRepository.find({
      where: { status: ChannelStatus.ACTIVE },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }
}

export const channelManagementService = new ChannelManagementService();
