/**
 * Channel Product Service
 * Phase PD-9: Multichannel RPA 1차
 *
 * Handles product export to external channels
 */

import AppDataSource from '../database/data-source.js';
import { ChannelProductLink, ChannelProductStatus } from '../entities/ChannelProductLink.js';
import { SellerProduct } from '../entities/SellerProduct.js';
import { channelConnectorRegistry } from '../channels/index.js';
import { channelManagementService } from './ChannelManagementService.js';

export interface CreateProductLinkDto {
  sellerId: string;
  channelAccountId: string;
  sellerProductIds: string[];
}

export interface ExportProductsDto {
  sellerId: string;
  channelAccountId: string;
  linkIds?: string[];
  exportAll?: boolean;
}

export class ChannelProductService {
  private linkRepository = AppDataSource.getRepository(ChannelProductLink);
  private productRepository = AppDataSource.getRepository(SellerProduct);

  /**
   * Create product links (prepare for export)
   */
  async createProductLinks(data: CreateProductLinkDto): Promise<ChannelProductLink[]> {
    const { sellerId, channelAccountId, sellerProductIds } = data;

    // Verify channel account
    const account = await channelManagementService.getChannelAccountById(channelAccountId, sellerId);

    // Get products
    const products = await this.productRepository.find({
      where: sellerProductIds.map(id => ({ id, sellerId })),
    });

    if (products.length !== sellerProductIds.length) {
      throw new Error('Some products not found or not owned by seller');
    }

    const links: ChannelProductLink[] = [];

    for (const product of products) {
      // Check if link already exists
      const existing = await this.linkRepository.findOne({
        where: {
          sellerId,
          channelAccountId,
          sellerProductId: product.id,
        },
      });

      if (existing) {
        links.push(existing);
        continue;
      }

      // Create new link
      const link = this.linkRepository.create({
        sellerId,
        channelAccountId,
        sellerProductId: product.id,
        status: ChannelProductStatus.DRAFT,
        isActive: true,
        exportCount: 0,
      });

      await this.linkRepository.save(link);
      links.push(link);
    }

    return links;
  }

  /**
   * Export products to channel
   */
  async exportProducts(data: ExportProductsDto): Promise<{
    successful: number;
    failed: number;
    results: Array<{ linkId: string; status: 'success' | 'failed'; message?: string }>;
  }> {
    const { sellerId, channelAccountId, linkIds, exportAll } = data;

    // Get channel account
    const account = await channelManagementService.getChannelAccountById(channelAccountId, sellerId);

    // Get connector
    const connector = channelConnectorRegistry.getConnector(account.channelCode);

    // Get links to export
    const where: any = {
      sellerId,
      channelAccountId,
      isActive: true,
    };

    if (!exportAll && linkIds) {
      where.id = linkIds;
    } else if (!exportAll) {
      where.status = ChannelProductStatus.DRAFT;
    }

    const links = await this.linkRepository.find({
      where,
      relations: ['sellerProduct', 'sellerProduct.product'],
    });

    if (links.length === 0) {
      return { successful: 0, failed: 0, results: [] };
    }

    // Call connector to export
    const exportResult = await connector.exportProducts({
      account,
      links,
    });

    // Update link statuses
    const results: Array<{ linkId: string; status: 'success' | 'failed'; message?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const success of exportResult.successful) {
      const link = links.find(l => l.id === success.linkId);
      if (link) {
        link.markExported(success.externalProductId, success.externalUrl);
        await this.linkRepository.save(link);
        results.push({ linkId: success.linkId, status: 'success' });
        successful++;
      }
    }

    for (const failure of exportResult.failed) {
      const link = links.find(l => l.id === failure.linkId);
      if (link) {
        link.markFailed(failure.error);
        await this.linkRepository.save(link);
        results.push({ linkId: failure.linkId, status: 'failed', message: failure.error });
        failed++;
      }
    }

    return { successful, failed, results };
  }

  /**
   * Get product links for a channel account
   */
  async getProductLinks(
    sellerId: string,
    channelAccountId: string
  ): Promise<ChannelProductLink[]> {
    return this.linkRepository.find({
      where: { sellerId, channelAccountId },
      relations: ['sellerProduct', 'sellerProduct.product'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Delete product link
   */
  async deleteProductLink(id: string, sellerId: string): Promise<void> {
    const link = await this.linkRepository.findOne({
      where: { id, sellerId },
    });

    if (!link) {
      throw new Error('Product link not found');
    }

    await this.linkRepository.remove(link);
  }
}

export const channelProductService = new ChannelProductService();
