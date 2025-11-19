/**
 * Channels Controller
 * Phase PD-9: Multichannel RPA 1차
 *
 * Handles HTTP requests for multichannel management
 */

import { Request, Response } from 'express';
import { channelManagementService, CreateChannelAccountDto, UpdateChannelAccountDto } from '../../services/ChannelManagementService.js';
import { channelProductService, CreateProductLinkDto, ExportProductsDto } from '../../services/ChannelProductService.js';
import { channelOrderService, ImportOrdersDto } from '../../services/ChannelOrderService.js';

export class ChannelsController {
  /**
   * GET /api/v1/channels
   * List all available channels
   */
  static async listAvailableChannels(req: Request, res: Response): Promise<void> {
    try {
      const channels = await channelManagementService.listAvailableChannels();

      res.json({
        success: true,
        data: channels,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch channels',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/channels/accounts
   * Get seller's channel accounts
   */
  static async getChannelAccounts(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user.id;

      const accounts = await channelManagementService.getSellerChannelAccounts(sellerId);

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch channel accounts',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/v1/channels/accounts
   * Create new channel account
   */
  static async createChannelAccount(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user.id;
      const data: CreateChannelAccountDto = {
        sellerId,
        channelCode: req.body.channelCode,
        displayName: req.body.displayName,
        credentials: req.body.credentials,
        metadata: req.body.metadata,
      };

      const account = await channelManagementService.createChannelAccount(data);

      res.status(201).json({
        success: true,
        data: account,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to create channel account',
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/v1/channels/accounts/:id
   * Update channel account
   */
  static async updateChannelAccount(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user.id;
      const { id } = req.params;
      const data: UpdateChannelAccountDto = req.body;

      const account = await channelManagementService.updateChannelAccount(id, sellerId, data);

      res.json({
        success: true,
        data: account,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to update channel account',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/v1/channels/accounts/:id
   * Delete channel account
   */
  static async deleteChannelAccount(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user.id;
      const { id } = req.params;

      await channelManagementService.deleteChannelAccount(id, sellerId);

      res.json({
        success: true,
        message: 'Channel account deleted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to delete channel account',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/v1/channels/accounts/:accountId/products
   * Create product links
   */
  static async createProductLinks(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user.id;
      const { accountId } = req.params;
      const { sellerProductIds } = req.body;

      const data: CreateProductLinkDto = {
        sellerId,
        channelAccountId: accountId,
        sellerProductIds,
      };

      const links = await channelProductService.createProductLinks(data);

      res.status(201).json({
        success: true,
        data: links,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to create product links',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/v1/channels/accounts/:accountId/products/export
   * Export products to channel
   */
  static async exportProducts(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user.id;
      const { accountId } = req.params;
      const { linkIds, exportAll } = req.body;

      const data: ExportProductsDto = {
        sellerId,
        channelAccountId: accountId,
        linkIds,
        exportAll,
      };

      const result = await channelProductService.exportProducts(data);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to export products',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/channels/accounts/:accountId/products
   * Get product links
   */
  static async getProductLinks(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user.id;
      const { accountId } = req.params;

      const links = await channelProductService.getProductLinks(sellerId, accountId);

      res.json({
        success: true,
        data: links,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch product links',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/v1/channels/products/links/:linkId
   * Delete product link
   */
  static async deleteProductLink(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user.id;
      const { linkId } = req.params;

      await channelProductService.deleteProductLink(linkId, sellerId);

      res.json({
        success: true,
        message: 'Product link deleted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to delete product link',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/v1/channels/accounts/:accountId/orders/import
   * Import orders from channel
   */
  static async importOrders(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user.id;
      const { accountId } = req.params;
      const { since, limit } = req.body;

      const data: ImportOrdersDto = {
        sellerId,
        channelAccountId: accountId,
        since: since ? new Date(since) : undefined,
        limit,
      };

      const result = await channelOrderService.importOrders(data);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to import orders',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/channels/accounts/:accountId/orders
   * Get order links
   */
  static async getOrderLinks(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user.id;
      const { accountId } = req.params;

      const links = await channelOrderService.getOrderLinks(sellerId, accountId);

      res.json({
        success: true,
        data: links,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch order links',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/channels/accounts/:accountId/stats
   * Get channel import statistics
   */
  static async getImportStats(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user.id;
      const { accountId } = req.params;

      const stats = await channelOrderService.getImportStats(sellerId, accountId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/v1/channels/orders/links/:linkId/retry
   * Retry failed order import
   */
  static async retryOrderImport(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user.id;
      const { linkId } = req.params;

      const link = await channelOrderService.retryImport(linkId, sellerId);

      res.json({
        success: true,
        data: link,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to retry import',
        message: error.message,
      });
    }
  }
}
